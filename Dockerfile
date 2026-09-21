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

# Instalar Prisma CLI globalmente e limpar cache do npm imediatamente para reduzir o tamanho da imagem
RUN npm install -g prisma@6.19.3 && \
    npm cache clean --force && \
    rm -rf /root/.npm /root/.cache /tmp/*

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

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
