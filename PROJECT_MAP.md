# Mapa do Projeto - Martins3DVault (v1.2.0)

Este documento serve como o **mapa técnico completo e exaustivo** da arquitetura do Martins3DVault. Ele foi projetado para que qualquer engenheiro de software ou modelo de inteligência artificial compreenda instantaneamente a estrutura de diretórios, o fluxo de dados, a modelagem de banco de dados e os contratos de API.

---

## 1. Visão Geral da Arquitetura

O Martins3DVault é uma aplicação web completa, conteinerizada (*Docker & Docker Compose*), auto-hospedada (*self-hosted*), construída com Next.js (App Router), Three.js, Prisma ORM e PostgreSQL.

```
┌────────────────────────────────────────────────────────────────────────┐
│                            MARTINS3DVAULT v1.2.0                       │
├──────────────────────────┬─────────────────────────────┬───────────────┤
│       APRESENTAÇÃO       │       NEGÓCIO & PARSERS     │  PERSISTÊNCIA │
│  - Linear/Vercel Dark UI │  - Directory Crawler & Sync │  - PostgreSQL │
│  - Three.js Fast Engine  │  - 3MF to Binary STL Parser │  - Prisma ORM │
│  - STLLoader Streaming   │  - Affine Transform Matrix  │  - Volumes FS │
│  - Medições em mm        │  - Companion Image Normaliz.│  - Session JWT│
│  - Gestão de Coleções    │  - Upload Multipart Parser  │  - Disk Cache │
│  - Gestão de Usuários    │  - PDF Manual Manager       │               │
└──────────────────────────┴─────────────────────────────┴───────────────┘
```

---

## 2. Mapa Detalhado de Diretórios e Arquivos

```
/swarm/stl/
├── Dockerfile                     # Multi-stage Dockerfile com Prisma CLI global e Next.js Standalone
├── docker-compose.yml             # Orquestração de serviços: App (Martins3DVault) + PostgreSQL 16 + Healthchecks
├── docker-entrypoint.sh           # Script de boot: wait-for-db, prisma db push e seed de admin
├── .dockerignore                  # Arquivos ignorados na geração da imagem Docker
├── .env                           # Configurações de ambiente local
├── .env.example                   # Modelo documentado de variáveis de ambiente (APP_VERSION, etc.)
├── package.json                   # Dependências do projeto (Three, Prisma, Tailwind, etc.)
├── next.config.ts                 # Configuração do Next.js (output standalone, unoptimized images)
├── tsconfig.json                  # Configurações do compilador TypeScript
│
├── prisma/
│   └── schema.prisma              # Schema do banco de dados (User, Library, Collection, Model, ModelFile, ModelAsset, Tag, ScanJob)
│
├── libraries/                     # Ponto de montagem de volumes dos arquivos 3D do usuário/NAS
│   └── sample_library/            # Biblioteca de exemplo com modelos STL e 3MF reais
│
├── data/                          # Diretório persistente montado no Docker (/data)
│   ├── thumbnails/                # Cache de thumbnails extraídas e snapshots gerados
│   ├── cache/                     # Cache de geometrias STL binárias convertidas para streaming ultrarrápido
│   └── uploads/                   # Uploads manuais de usuários
│
└── src/
    ├── app/                       # Next.js App Router (Páginas e APIs)
    │   ├── layout.tsx             # Layout global com fontes e metatags do Martins3DVault
    │   ├── globals.css            # Tema Linear/Vercel Dark Mode e Glassmorphism
    │   ├── page.tsx               # Galeria principal com busca instantânea e filtros (formato e coleções)
    │   │
    │   ├── collections/
    │   │   ├── page.tsx           # Catálogo de coleções com contadores, miniaturas e criação manual
    │   │   └── [id]/
    │   │       └── page.tsx       # Detalhes da coleção, listagem de modelos e vinculação em lote
    │   │
    │   ├── libraries/
    │   │   └── page.tsx           # Gestor de bibliotecas de disco e controle de varreduras
    │   │
    │   ├── users/
    │   │   └── page.tsx           # Gestor de usuários e permissões (ADMIN, USER, VIEWER)
    │   │
    │   ├── metrics/
    │   │   └── page.tsx           # Dashboard com KPIs, espaço em disco e gráfico de formatos
    │   │
    │   ├── login/
    │   │   └── page.tsx           # Tela de autenticação com atalho para login admin
    │   │
    │   └── api/                   # Rotas de API Backend
    │       ├── auth/
    │       │   ├── login/route.ts  # POST: Autentica usuário e emite cookie JWT
    │       │   ├── logout/route.ts # POST: Invalida sessão e remove cookie
    │       │   └── me/route.ts     # GET: Retorna dados do usuário autenticado
    │       │
    │       ├── health/
    │       │   └── route.ts        # GET: Healthcheck do container e banco com versão e uptime
    │       │
    │       ├── users/
    │       │   └── route.ts        # GET: Lista | POST: Cria | PUT: Edita/Senha | DELETE: Exclui
    │       │
    │       ├── collections/
    │       │   ├── route.ts        # GET: Lista coleções | POST: Cria nova coleção manual
    │       │   └── [id]/
    │       │       ├── route.ts    # GET: Detalhes da coleção | PUT: Edita | DELETE: Remove
    │       │       └── models/
    │       │           └── route.ts # POST: Adiciona ou remove modelos em lote da coleção
    │       │
    │       ├── upload/
    │       │   └── route.ts        # POST: Upload multipart de STL, 3MF, imagens e manuais PDF
    │       │
    │       ├── libraries/
    │       │   ├── route.ts        # GET: Lista bibliotecas | POST: Cria nova biblioteca
    │       │   └── [id]/scan/
    │       │       └── route.ts    # POST: Dispara varredura recursiva e sincronização
    │       │
    │       ├── assets/
    │       │   ├── file/route.ts   # GET: Streaming direto de arquivos originais (com buffer 1MB)
    │       │   ├── mesh/route.ts   # GET: Streaming de alta velocidade de malhas STL binárias (com cache)
    │       │   └── thumbnails/
    │       │       └── [...path]/route.ts # GET: Serve imagens e capas do diretório de thumbnails
    │       │
    │       └── models/
    │           ├── route.ts        # GET: Busca inteligente multi-termo, pagina e filtra por formato e status de impresso (?printed=false)
    │           └── [id]/
    │               ├── route.ts    # GET: Detalhes completos | PUT: Renomeia, Notas, isPrinted, printedAt | DELETE
    │               ├── files/[fileId]/route.ts # PUT: Alterna status isPrinted de peça individual
    │               ├── cover/route.ts  # POST: Salva snapshot 3D ou nova imagem de capa
    │               └── manual/route.ts # POST: Upload de manual PDF | DELETE: Remove manual
    │
    ├── components/                # Componentes React Reutilizáveis
    │   ├── layout/
    │   │   └── Navbar.tsx         # Barra superior com logo, versão, links de navegação, busca com ⌘K e upload
    │   ├── gallery/
    │   │   ├── FilterBar.tsx      # Barra de filtros da galeria: busca na página, abas de impressos, formatos, coleções e ordenação
    │   │   └── ModelCard.tsx      # Card de modelo com capa prioritária, badges, toggle de impresso (1 clique) e favoritos
    │   ├── model/
    │   │   └── ModelDetailModal.tsx # Modal interativo com Three.js, abas, renomeação, capa, manuais e status de impresso
    │   ├── upload/
    │   │   └── UploadModal.tsx    # Modal de Drag & Drop para upload manual de arquivos
    │   └── viewer3d/
    │       └── ModelViewer3D.tsx  # Visualizador Three.js (STLLoader, Z-Up corrigido, PLA/ABS, presets de câmera)
    │
    └── lib/                       # Módulos de Lógica de Negócio e Serviços
        ├── auth/
        │   └── session.ts         # Geração e validação de tokens JWT (`jose`, `bcryptjs`)
        ├── prisma.ts              # Instância singleton global do Prisma Client
        └── scanner/
            ├── crawler.ts         # Motor de varredura recursiva com sincronização bidirecional
            └── extractors/
                ├── companion.ts   # Normalização de nomes e detecção de capas/manuais irmãos
                ├── stl-parser.ts  # Leitor e validador de geometria STL binário/ASCII
                ├── threemf.ts     # Extrator de thumbnails embutidas e metadados de fatiamento
                └── threemf-converter.ts # Extrator de geometrias 3MF e montador de STL Binário
```

---

## 3. Contratos de API Principais

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Status de saúde do container e banco, versão (`APP_VERSION`) e uptime. |
| `GET` | `/api/users` | Lista usuários cadastrados (apenas Administrador). |
| `POST` | `/api/users` | Cria novo usuário (`name, email, password, role`). |
| `PUT` | `/api/users` | Altera dados, nível de permissão ou redefine senha de um usuário. |
| `DELETE` | `/api/users?id={id}` | Remove um usuário do sistema. |
| `GET` | `/api/assets/mesh` | Serve a malha 3D em STL Binário de alta performance (com cache em disco). |
| `GET` | `/api/assets/file` | Download do arquivo original completo (`.3mf`, `.stl`, `.obj`). |
| `POST` | `/api/models/[id]/cover` | Altera a capa do modelo (upload de imagem, seleção de imagem existente ou snapshot 3D). |
| `POST` | `/api/models/[id]/manual` | Upload de manual de instruções em PDF vinculado ao modelo. |
| `DELETE` | `/api/models/[id]/manual?assetId={id}` | Exclui um manual PDF do modelo e do disco. |
| `PUT` | `/api/models/[id]` | Renomeia o modelo, altera coleção vinculada ou notas de impressão. |
