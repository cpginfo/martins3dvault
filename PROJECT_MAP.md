# Mapa do Projeto - Martins3DVault (v1.7.0)

Este documento descreve a topologia completa de diretórios, componentes, serviços de backend e arquitetura do **Martins3DVault**, auxiliando agentes de IA e desenvolvedores a navegar e estender a aplicação com total precisão técnica.

---

## 1. Visão Geral da Arquitetura

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           MARTINS3DVAULT v1.7.0                                  │
│             Google Stitch Design System ("Martins3D Vault Manager")              │
├────────────────────────────┬─────────────────────────────┬───────────────────────┤
│        APRESENTAÇÃO        │      NEGÓCIO & PARSERS      │      PERSISTÊNCIA     │
│  - Stitch Industrial Dark  │  - Directory Crawler & Sync │  - PostgreSQL 16      │
│  - Light Mode Calibrado    │  - 3MF to Binary STL Parser │  - Prisma ORM 6.19    │
│  - Persistent Sidebar & NAS│  - Affine Transform Matrix  │  - Docker Volumes FS  │
│  - Eagle-Style Studio Bar  │  - Companion Image Normaliz.│  - Session JWT (Jose) │
│  - Zoom Slider & View Modes│  - Upload Multipart Parser  │  - Disk Cache (STL)   │
│  - Three.js sob demanda    │  - CSV/Excel Smart Importer │  - Stitch Design Sync │
│  - Estúdio CAD / Dark 3D   │  - Streaming CSV Exporter   │  - LocalStorage Pref  │
│  - Calculadora & Vendas 3D │  - Theme State & Anti-FOUC  │  - PrinterSettings DB │
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
│       └── publish.yml            # Pipeline CI/CD: validação Node.js 22 LTS, login GHCR via GHCR_TOKEN, buildx e GitHub Releases
│
├── screenshots/                   # Capturas de tela demonstrativas da interface (README e documentação)
│   ├── calculadora.png            # Calculadora de Preço de Venda 3D e Live Breakdown
│   ├── orcamentos.png             # Gestão Comercial, Vendas e Importação/Exportação
│   ├── arquivo.png                # Estúdio CAD 3D e inspeção de arquivo
│   ├── colecao.png                # Galeria de modelos em coleção
│   ├── colecoes.png               # Visão geral de coleções
│   ├── metricas.png               # Painel de métricas e status do sistema
│   ├── pastas.png                 # Gerenciamento de pastas físicas e escaneamento
│   ├── upload.png                 # Formulário e upload de arquivos
│   └── usuarios.png               # Painel de gerenciamento de usuários
│
├── scripts/
│   └── import-sales.ts            # Utilitário CLI para importação de vendas em lote direto no banco
│
├── public/                        # Arquivos estáticos servidos diretamente pelo Next.js
│   ├── logo.png                   # Logotipo oficial Martins3DVault Neon Isométrico com canal alfa RGBA
│   ├── favicon.ico                # Ícone nativo multi-resolução (16x16, 32x32, 48x48, 64x64)
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
    │   ├── layout.tsx             # Layout global: Inter, JetBrains Mono, Material Symbols, Sidebar & Navbar, Favicon Metadata
    │   ├── favicon.ico            # Rota nativa do Favicon multi-resolução
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
    │   ├── pricing/               # Módulo de Precificação & Vendas 3D (v1.6.0)
    │   │   ├── page.tsx           # Hub de 4 abas: Calculadora, Orçamentos, Dashboard e Configurações
    │   │   └── components/
    │   │       ├── CalculatorTab.tsx   # Calculadora 2-colunas com preview em tempo real e acessórios
    │   │       ├── BudgetsTab.tsx      # Listagem com busca, filtros (orçamentos vs vendas) e duplicação
    │   │       ├── DashboardTab.tsx    # 6 Bento cards contábeis calculados estritamente sobre vendas
    │   │       ├── SettingsTab.tsx     # Parâmetros da máquina, taxas horárias e catálogo de materiais
    │   │       ├── ImportModal.tsx     # Modal inteligente de importação CSV / Excel
    │   │       ├── BudgetDetailModal.tsx # Detalhamento analítico de custos e lucro
    │   │       └── SaleModal.tsx       # Modal de conversão rápida e registro de preço real vendido
    │   │
    │   ├── login/
    │   │   └── page.tsx           # Tela de autenticação com fundo CAD isométrico e novo logotipo neon
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
    │       ├── pricing/            # Rotas da API de Precificação & Vendas (v1.5.10)
    │       │   ├── settings/route.ts   # GET / PUT: Configurações persistentes da impressora e oficina
    │       │   ├── materials/route.ts  # GET / POST: Catálogo de filamentos e materiais
    │       │   ├── materials/[id]/route.ts # PUT / DELETE: Edição e exclusão de filamento
    │       │   ├── budgets/route.ts    # GET (filtros) / POST: Criação transacional de orçamentos e acessórios
    │       │   ├── budgets/[id]/route.ts # GET / PUT (edição/conversão em venda) / DELETE
    │       │   ├── stats/route.ts      # GET: Agregação contábil restrita estritamente a vendas concretizadas
    │       │   ├── import/route.ts     # POST: Importador inteligente de planilhas CSV/Excel com autodetecção de colunas
    │       │   └── export/route.ts     # GET: Exportador completo de vendas em CSV com UTF-8 BOM e pontuação brasileira
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
    │   │   ├── Sidebar.tsx        # Sidebar retrátil: logo, navegação reordenada (Modelos 3D antes de Coleções), gauge NAS RAID 5 e perfil
    │   │   └── Navbar.tsx         # Barra superior: busca global ⌘K, pills de formato (.STL, .3MF, G-Code), status NAS, ThemeToggle e scan
    │   ├── theme/
    │   │   └── ThemeToggle.tsx    # Botão de alternância animado Dark/Light Mode
    │   ├── gallery/
    │   │   ├── FilterBar.tsx      # Controles de estúdio Eagle: zoom slider (180-400px), modos de visualização (grade/tabela), polímeros
    │   │   └── ModelCard.tsx      # Card de modelo Stitch: capa prioritária, badges de polímero, medidas mm e toggle de impressão
    │   ├── model/
    │   │   └── ModelDetailModal.tsx # Modal interativo com Three.js, abas, renomeação, capa, manuais e status de impresso
    │   ├── upload/
    │   │   └── UploadModal.tsx    # Modal de Upload local e Download por Link (URL) com tabs e suporte a ZIP
    │   └── viewer3d/
    │       └── ModelViewer3D.tsx  # Viewport Three.js sob demanda: miniatura 2D inicial, botão 'Carregar Malha 3D', orbit, materiais e snapshot
    │
    ├── proxy.ts                   # Next.js 16 Proxy layer: proteção de rotas públicas e autenticação de API com ADMIN
    │
    └── lib/                       # Módulos de Lógica de Negócio e Serviços
        ├── theme/
        │   └── ThemeContext.tsx   # Contexto global de tema, sincronização localStorage e anti-FOUC
        ├── auth/
        │   └── session.ts         # Autenticação JWT, Cookie pv_session, Bearer Token, Basic Auth e requireAdmin
        ├── users/
        │   └── avatar.ts          # Processador e persistência de fotos de avatar em /data/thumbnails/
        ├── prisma.ts              # Instância singleton global do Prisma Client
        ├── pricing/               # Motor Matemático & Tipagens de Precificação 3D
        │   ├── types.ts           # Interfaces de configuração, orçamentos, acessórios, vendas e métricas
        │   ├── calculator.ts      # Fórmulas puras de custos, energia, depreciação, lucro e BRL
        │   └── __tests__/
        │       └── calculator.test.ts # Suíte com 5 testes unitários determinísticos
        ├── storage/
        │   └── file-ops.ts        # Movimentação física de arquivos, renomeação no disco e prevenção de sobrescrita (sufixo)
        └── scanner/
            ├── crawler.ts         # Motor de varredura recursiva com espelhamento total (remoção de coleções/modelos deletados no disco)
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
| `GET` | `/api/health` | Status de saúde do container e banco, versão (`v1.7.0`) e uptime. |
| `GET` / `PUT` | `/api/pricing/settings` | Obtém ou atualiza configurações persistentes da impressora, potência e taxas horárias. |
| `GET` / `POST` | `/api/pricing/materials` | Lista filamentos ou cadastra novo material com custo por kg e densidade. |
| `GET` / `POST` | `/api/pricing/budgets` | Busca/filtra orçamentos ou cria novo orçamento com snapshot paramétrico da máquina. |
| `GET` / `PUT` / `DELETE` | `/api/pricing/budgets/[id]` | Consulta analítica, edição completa, conversão em venda com preço real, ou exclusão. |
| `GET` | `/api/pricing/stats` | Agregação contábil e telemetria comercial exclusivamente sobre vendas (`isSale: true`). |
| `POST` | `/api/pricing/import` | Ingestão em lote de orçamentos e vendas via arquivo CSV ou dados colados do Excel. |
| `GET` | `/api/pricing/export` | Exportação de dados e vendas em CSV compatível com o Microsoft Excel brasileiro. |
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
