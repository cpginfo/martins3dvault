# Mapa do Projeto - Martins3DVault (v1.5.1)

Este documento descreve a topologia completa de diretórios, componentes, serviços de backend e arquitetura do **Martins3DVault**, auxiliando agentes de IA e desenvolvedores a navegar e estender a aplicação com total precisão técnica.

---

## 1. Visão Geral da Arquitetura

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           MARTINS3DVAULT v1.5.1                                  │
│             Google Stitch Design System ("Martins3D Vault Manager")              │
├────────────────────────────┬─────────────────────────────┬───────────────────────┤
│        APRESENTAÇÃO        │      NEGÓCIO & PARSERS      │      PERSISTÊNCIA     │
│  - Stitch Industrial Dark  │  - Directory Crawler & Sync │  - PostgreSQL 16      │
│  - Persistent Sidebar & NAS│  - 3MF to Binary STL Parser │  - Prisma ORM 6.19    │
│  - Eagle-Style Studio Bar  │  - Affine Transform Matrix  │  - Docker Volumes FS  │
│  - Zoom Slider & View Modes│  - Companion Image Normaliz.│  - Session JWT (Jose) │
│  - Three.js Fast Engine    │  - Upload Multipart Parser  │  - Disk Cache (STL)   │
│  - Telemetria de Oficina   │  - PDF Manual Manager       │  - Stitch Design Sync │
└────────────────────────────┴─────────────────────────────┴───────────────────────┘
```

---

## 2. Mapa Detalhado de Diretórios e Arquivos

```
/swarm/stl/
├── Dockerfile                     # Multi-stage Dockerfile enxuto com Prisma CLI global e Next.js Standalone (199MB)
├── docker-compose.yml             # Orquestração de serviços com fallbacks: 3d-vault-web + 3d-vault-db (PostgreSQL 16)
├── docker-entrypoint.sh           # Script de boot dinâmico: wait-for-db, prisma db push (auto tabelas) e seed de admin/biblioteca
├── .dockerignore                  # Arquivos ignorados na geração da imagem Docker
├── .env                           # Configurações de ambiente local
├── .env.example                   # Modelo documentado de variáveis de ambiente (POSTGRES_*, ADMIN_*, etc.)
├── package.json                   # Dependências do projeto (Three, Prisma, Tailwind v4, etc.)
├── next.config.ts                 # Configuração do Next.js (output standalone, unoptimized images)
├── tsconfig.json                  # Configurações do compilador TypeScript
│
├── .agents/
│   └── mcp_config.json            # Configuração do Stitch MCP Server (@_davideast/stitch-mcp proxy)
│
├── .github/
│   └── workflows/
│       └── publish.yml            # Pipeline CI/CD: validação Next.js, publicação no GHCR e GitHub Releases
│
├── stitch_export/                 # Exportação bruta das 6 telas e assets do Google Stitch (Martins3D Vault Manager)
│   ├── screen_*.html              # Telas HTML geradas pelo Stitch
│   └── *.png                      # Assets visuais originais do Stitch
│
├── public/                        # Arquivos estáticos servidos diretamente pelo Next.js
│   ├── logo.png                   # Logotipo oficial Martins3DVault (laranja industrial/3D cúbico)
│   └── avatar.png                 # Avatar padrão de perfil do operador
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
    │   ├── layout.tsx             # Layout global: Inter, JetBrains Mono, Material Symbols, Sidebar & Navbar
    │   ├── globals.css            # Tema Stitch Industrial Dark Mode com Tailwind CSS v4 @theme tokens
    │   ├── page.tsx               # Explorador de Modelos 3D com breadcrumb, Eagle FilterBar e grid dinâmico
    │   │
    │   ├── collections/
    │   │   ├── page.tsx           # Painel de Coleções: métricas (4 cards bento), catálogo temático e botão de criação
    │   │   └── [id]/
    │   │       └── page.tsx       # Detalhes da coleção, listagem de modelos e vinculação em lote
    │   │
    │   ├── libraries/
    │   │   └── page.tsx           # Mapear Pastas & Scan: HUD AdditiveCore, status RAID 5, hash monitor e logs de scan
    │   │
    │   ├── users/
    │   │   └── page.tsx           # Gestão de Usuários & Permissões: tabela RBAC (ADMIN, OPERATOR, VIEWER)
    │   │
    │   ├── models/
    │   │   └── [id]/
    │   │       └── page.tsx       # Visualizador 3D Studio: viewport Three.js, HUD técnico de dimensões, parâmetros de fatiamento e drawer
    │   │
    │   ├── viewer/
    │   │   └── [id]/
    │   │       └── page.tsx       # Alias de rota para o Visualizador 3D Studio
    │   │
    │   ├── metrics/
    │   │   └── page.tsx           # Métricas & Telemetria: telemetria de oficina e Bento KPIs
    │   │
    │   ├── login/
    │   │   └── page.tsx           # Tela de autenticação com fundo CAD isométrico e atalho de demonstração
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
    │       │   ├── route.ts        # GET: Lista | POST: Cria usuário (Nome, Foto, Senha, Email, Role)
    │       │   └── [id]/
    │       │       └── route.ts    # GET: Detalhes | PUT: Edita os 5 campos (Nome, Foto, Senha, Email, Role) | DELETE: Exclui
    │       │
    │       ├── collections/
    │       │   ├── route.ts        # GET: Lista coleções | POST: Cria nova coleção manual
    │       │   └── [id]/
    │       │       ├── route.ts    # GET: Detalhes da coleção | PUT: Edita | DELETE: Remove
    │       │       └── models/
    │       │           └── route.ts # POST: Adiciona ou remove modelos em lote da coleção
    │       │
    │       ├── upload/
    │       │   ├── route.ts        # POST: Upload multipart de STL, 3MF, imagens e manuais PDF
    │       │   └── url/route.ts    # POST: Download via link HTTP/HTTPS de arquivos 3D ou ZIP direto para pasta/coleção download
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
    │           ├── move/route.ts   # POST: Movimentação em lote de arquivos e acompanhantes entre coleções no disco
    │           └── [id]/
    │               ├── route.ts    # GET: Detalhes completos | PUT: Renomeia no disco, Move coleção, Notas, isPrinted | DELETE
    │               ├── files/[fileId]/route.ts # PUT: Alterna status isPrinted de peça individual
    │               ├── cover/route.ts  # POST: Salva snapshot 3D ou nova imagem de capa
    │               └── manual/route.ts # POST: Upload de manual PDF | DELETE: Remove manual
    │
    ├── components/                # Componentes React Reutilizáveis
    │   ├── layout/
    │   │   ├── Sidebar.tsx        # Sidebar retrátil persistente: logo, menus por categoria, gauge NAS RAID 5 e perfil
    │   │   └── Navbar.tsx         # Barra superior: busca global ⌘K, pills de formato (.STL, .3MF, G-Code), status NAS e scan
    │   ├── gallery/
    │   │   ├── FilterBar.tsx      # Controles de estúdio Eagle: zoom slider (180-400px), modos de visualização (grade/tabela), polímeros
    │   │   └── ModelCard.tsx      # Card de modelo Stitch: capa prioritária, badges de polímero, medidas mm e toggle de impressão
    │   ├── model/
    │   │   └── ModelDetailModal.tsx # Modal interativo com Three.js, abas, renomeação, capa, manuais e status de impresso
    │   ├── upload/
    │   │   └── UploadModal.tsx    # Modal de Upload local e Download por Link (URL) com tabs e suporte a ZIP
    │   └── viewer3d/
    │       └── ModelViewer3D.tsx  # Visualizador Three.js (STLLoader, Z-Up corrigido, PLA/ABS, presets de câmera)
    │
    ├── proxy.ts                   # Next.js 16 Proxy layer: proteção de rotas públicas e autenticação de API com ADMIN
    │
    └── lib/                       # Módulos de Lógica de Negócio e Serviços
        ├── auth/
        │   └── session.ts         # Autenticação JWT, Cookie pv_session, Bearer Token, Basic Auth e requireAdmin
        ├── users/
        │   └── avatar.ts          # Processador e persistência de fotos de avatar em /data/thumbnails/
        ├── prisma.ts              # Instância singleton global do Prisma Client
        ├── storage/
        │   └── file-ops.ts        # Movimentação física de arquivos, renomeação no disco e prevenção de sobrescrita (sufixo)
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
| `GET` | `/api/health` | Status de saúde do container e banco, versão (`v1.5.1`) e uptime. |
| `GET` | `/api/users` | Lista usuários cadastrados (apenas Administrador). |
| `POST` | `/api/users` | Cria novo usuário com todos os 5 campos (`name, email, password, role, avatar`). |
| `GET` | `/api/users/[id]` | Retorna detalhes cadastrais de um usuário específico. |
| `PUT` | `/api/users/[id]` | Edita os 5 campos do usuário (`name, email, password, role, avatar`) com validação de e-mail e senha. |
| `DELETE` | `/api/users/[id]` | Remove um usuário do sistema (com proteção contra auto-exclusão). |
| `GET` | `/api/assets/mesh` | Serve a malha 3D em STL Binário de alta performance (com cache em disco). |
| `GET` | `/api/assets/file` | Download do arquivo original completo (`.3mf`, `.stl`, `.obj`). |
| `POST` | `/api/models/move` | Move modelos e seus arquivos complementares (imagem e PDF) fisicamente entre pastas de coleção no disco. |
| `POST` | `/api/upload/url` | Baixa arquivo 3D ou pacote ZIP de uma URL diretamente para a pasta/coleção `download`. |
| `POST` | `/api/models/[id]/cover` | Altera a capa do modelo (upload de imagem, seleção de imagem existente ou snapshot 3D). |
| `POST` | `/api/models/[id]/manual` | Upload de manual de instruções em PDF vinculado ao modelo. |
| `DELETE` | `/api/models/[id]/manual?assetId={id}` | Exclui um manual PDF do modelo e do disco. |
| `PUT` | `/api/models/[id]` | Renomeia fisicamente o modelo e arquivos no disco, altera coleção ou notas de impressão. |
