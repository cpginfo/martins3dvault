# Multi-stage Dockerfile enxuto para Martins3DVault (Next.js Standalone + Prisma)
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl

# Estágio de Dependências
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm ci --legacy-peer-deps && \
    npx prisma generate && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.cache

# Estágio de Build
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Next.js standalone build
RUN npm run build && \
    rm -rf /root/.npm /root/.cache

# Estágio Isolado do Prisma CLI para migrações (com override de segurança CVE-2026-40345)
FROM base AS prisma-cli
WORKDIR /opt/prisma-cli
COPY package.json ./
RUN node -e "const p = require('./package.json'); const ver = (p.dependencies && p.dependencies['prisma']) || '6.19.3'; require('fs').writeFileSync('package.json', JSON.stringify({name:'prisma-cli',private:true,dependencies:{prisma:ver},overrides:{'deepmerge-ts':'8.0.0'}}));" && \
    npm install && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.cache

# Estágio de Execução (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Cria diretórios persistentes com permissões adequadas
RUN mkdir -p /data/thumbnails /data/uploads /data/cache /libraries && \
    chown -R nextjs:nodejs /data /libraries

# Copiar Prisma CLI isolado do estágio de build (elimina npm install no runner)
COPY --from=prisma-cli --chown=nextjs:nodejs /opt/prisma-cli /opt/prisma-cli
RUN ln -s /opt/prisma-cli/node_modules/.bin/prisma /usr/local/bin/prisma && \
    rm -rf /root/.npm /root/.cache /tmp/* \
    /usr/local/lib/node_modules/npm \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack

# Copiar apenas os artefatos estritamente necessários para execução standalone
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh

USER nextjs

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]