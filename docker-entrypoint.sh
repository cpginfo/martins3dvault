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
    
    function check() {
      const sock = new net.Socket();
      sock.setTimeout(2000);
      sock.on('connect', () => {
        console.log('✅ Banco de dados conectado com sucesso!');
        sock.destroy();
        process.exit(0);
      });
      sock.on('error', () => {
        setTimeout(check, 1000);
      });
      sock.on('timeout', () => {
        sock.destroy();
        setTimeout(check, 1000);
      });
      sock.connect(port, host);
    }
    check();
  "
  
  echo "📦 Sincronizando schema do banco de dados (Prisma)..."
  prisma db push --skip-generate
  
  echo "🌱 Verificando/Criando usuário administrador padrão..."
  node -e "
    const { PrismaClient } = require('@prisma/client');
    const bcrypt = require('bcryptjs');
    const prisma = new PrismaClient();
    
    async function main() {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@printvault.local';
      const adminPass = process.env.ADMIN_PASSWORD || 'admin123';
      const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
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
        console.log('👑 Administrador padrão criado:', adminEmail);
      } else {
        console.log('👤 Administrador já existente:', adminEmail);
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
    main().catch(console.error).finally(() => prisma.\$disconnect());
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
