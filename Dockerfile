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

# Instala o Prisma CLI de forma isolada (não global), forçando a versão
# corrigida do deepmerge-ts via "overrides" do npm — resolve CVE-2026-40345
# sem depender de patch oficial do Prisma. Em seguida remove o npm/npx/corepack
# embutidos na imagem base, já que não são usados em runtime pela aplicação
# (apenas "node" e o binário "prisma" são necessários).
RUN mkdir -p /opt/prisma-cli && cd /opt/prisma-cli && \
    printf '{"name":"prisma-cli","private":true,"dependencies":{"prisma":"6.19.3"},"overrides":{"deepmerge-ts":"8.0.0"}}' > package.json && \
    npm install && \
    ln -s /opt/prisma-cli/node_modules/.bin/prisma /usr/local/bin/prisma && \
    chown -R nextjs:nodejs /opt/prisma-cli && \
    npm cache clean --force && \
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