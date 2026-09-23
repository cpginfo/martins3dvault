#!/bin/sh
set -e

echo "🚀 Iniciando o Martins3DVault..."

# Espera o PostgreSQL ficar disponível se DATABASE_URL estiver configurado
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Aguardando banco de dados PostgreSQL..."
  node -e "
    const net = require('net');
    const url = new URL(process.env.DATABASE_URL);
    const host = url.hostname;
    const port = url.port || 5432;
    const MAX_RETRIES = 30;
    let attempts = 0;

    function check() {
      attempts++;
      const sock = new net.Socket();
      sock.setTimeout(2000);
      sock.on('connect', () => {
        console.log('✅ Banco de dados conectado com sucesso!');
        sock.destroy();
        process.exit(0);
      });
      sock.on('error', () => {
        if (attempts >= MAX_RETRIES) {
          console.error('❌ Não foi possível conectar ao banco após ' + MAX_RETRIES + ' tentativas.');
          process.exit(1);
        }
        console.log('   tentativa ' + attempts + '/' + MAX_RETRIES + '...');
        setTimeout(check, 2000);
      });
      sock.on('timeout', () => {
        sock.destroy();
        if (attempts >= MAX_RETRIES) {
          console.error('❌ Timeout ao conectar ao banco após ' + MAX_RETRIES + ' tentativas.');
          process.exit(1);
        }
        setTimeout(check, 2000);
      });
      sock.connect(port, host);
    }
    check();
  "

  node -e "
    const url = new URL(process.env.DATABASE_URL);
    const dbName = url.pathname.replace(/^\//, '') || 'printvault';
    console.log('🎯 Conectando ao banco de dados: \'' + dbName + '\' com usuário: \'' + url.username + '\'');
  "

  echo "📦 Sincronizando tabelas do banco de dados (Prisma)..."
  prisma db push --skip-generate

  echo "🌱 Verificando/Criando usuário administrador configurado no Compose..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();

    // Controla se a senha do admin deve ser resincronizada a cada boot.
    // Padrão: false — preserva alterações feitas pela interface do sistema.
    const forceReset = (process.env.ADMIN_FORCE_RESET || 'false').toLowerCase() === 'true';

    async function main() {
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@printvault.local').toLowerCase().trim();
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';

      if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
        console.warn('⚠️  ADMIN_EMAIL/ADMIN_PASSWORD não definidos no compose — usando valores padrão (inseguro para produção).');
      }

      const existing = await prisma.user.findFirst({
        where: { email: { equals: adminEmail, mode: 'insensitive' } }
      });

      if (!existing) {
        const hash = await bcrypt.hash(adminPass, 10);
        await prisma.user.create({
          data: {
            name: 'Administrador Martins3DVault',
            email: adminEmail,
            passwordHash: hash,
            role: 'ADMIN'
          }
        });
        console.log('👑 Usuário administrador criado com sucesso:', adminEmail);
      } else if (forceReset) {
        const isMatch = await bcrypt.compare(adminPass, existing.passwordHash);
        if (!isMatch) {
          const newHash = await bcrypt.hash(adminPass, 10);
          await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash: newHash, role: 'ADMIN' }
          });
          console.log('🔄 Senha do administrador resincronizada com o Compose (ADMIN_FORCE_RESET=true):', adminEmail);
        } else {
          console.log('👤 Usuário administrador verificado no banco:', adminEmail);
        }
      } else {
        console.log('👤 Usuário administrador já existe — senha preservada (defina ADMIN_FORCE_RESET=true para resincronizar):', adminEmail);
      }

      // Garante uma biblioteca inicial se o banco estiver vazio
      const defaultLibPath = process.env.STORAGE_LIBRARIES_PATH || '/libraries';
      const existingLib = await prisma.library.findFirst();
      if (!existingLib) {
        await prisma.library.create({
          data: {
            name: 'Biblioteca Principal',
            path: defaultLibPath,
            enabled: true,
          }
        });
        console.log('📚 Biblioteca padrão criada:', defaultLibPath);
      } else {
        console.log('📚 Biblioteca já existente:', existingLib.name);
      }
    }
    main().catch((err) => {
      console.error('❌ Erro ao inicializar dados padrão:', err);
      process.exit(1);
    }).finally(() => prisma.\$disconnect());
  "
fi

# Cria diretórios de dados se não existirem
DATA_DIR="${STORAGE_DATA_PATH:-/data}"
LIB_DIR="${STORAGE_LIBRARIES_PATH:-/libraries}"

mkdir -p "$DATA_DIR/thumbnails"
mkdir -p "$DATA_DIR/uploads"
mkdir -p "$DATA_DIR/cache"
mkdir -p "$LIB_DIR"

echo "✨ Martins3DVault pronto! Iniciando servidor na porta ${PORT:-3000}..."
exec "$@"