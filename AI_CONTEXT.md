# AI Context & Developer Handover Guide - Martins3DVault

> **INSTRUÇÃO PARA OUTRAS IAs / DESENVOLVEDORES:**
> Se você é um modelo de IA (Claude, GPT, Cursor, Copilot, Gemini, DeepSeek, etc.) ou um engenheiro assumindo este repositório, **leia este arquivo primeiro**. Ele resume todo o contexto técnico, restrições arquiteturais, armadilhas comuns já superadas e os próximos passos planejados.

---

## 1. O que é o Martins3DVault?

O **Martins3DVault** (anteriormente chamado PrintVault) é uma plataforma auto-hospedada (*self-hosted*), conteinerizada via Docker, focada na catalogação, visualização 3D em tempo real de alta performance e gerenciamento de projetos de impressão 3D (`.stl`, `.3mf`, `.obj`, `.step`).

- **Design System Google Stitch ("Martins3D Vault Manager")**:
  - Toda a interface foi reconstruída com base no projeto exportado via Stitch MCP (`projects/1712109623850818548`).
  - Paleta industrial moderna com tema escuro nativo (`surface: #0f141b`, `primary-container: #f97316`, `secondary: #4cd7f6`, `tertiary: #4edea3`).
  - Tipografia técnica com **Inter**, **JetBrains Mono** e ícones **Material Symbols Outlined**.
  - **Sidebar Retrátil Persistente** (`Sidebar.tsx`): Menus por categoria, gauge de armazenamento RAID 5 e perfil do operador logado.
  - **Barra Superior Integrada** (`Navbar.tsx`): Busca global com atalho `⌘K`, filtros rápidos por extensão (`.STL`, `.3MF`, `G-Code`), status do NAS e acionamento de scan.
  - **Controles de Estúdio Estilo Eagle App** (`FilterBar.tsx`): Slider de zoom de miniaturas (180px a 400px), alternador de visualização (Grade Grande, Grade Compacta e Tabela), e badges de polímeros (PLA, PETG, ABS/ASA, TPU).
- **Visualizador 3D Studio (`/models/[id]` e `/viewer/[id]`)**:
  - Tela dedicada de visualização e fatiamento baseada na importação do Google Stitch (`Visualizador de Arquivo 3D`).
  - Viewport 3D Three.js com HUD de dimensões milimétricas em tempo real (X, Y, Z), controles de câmera rápida (`Iso`, `Frente`, `Topo`, `Reset`), rotação automática, modo Wireframe/Sólido e bounding box.
  - Captura instantânea de capa 3D (`Capa 3D`) gerando thumbnail oficial do modelo.
  - Barra inferior flutuante com troca de material (`PLA`, `ABS`, `PETG`, `Fosco`) e paleta com 12 cores de filamento.
  - Painel lateral (drawer) com breadcrumbs, renomeação de modelo inline, seleção de coleções, troca de capa, abas de arquivos, notas técnicas e manuais em PDF.
  - Parâmetros recomendados de fatiamento reais extraídos dos arquivos `.3mf` (altura de camada, tempo estimado, consumo em gramas e metros, e contagem de triângulos da malha).
  - Verificação algorítmica de compatibilidade de volume de mesa (Bambu Lab 256×256×256 mm, Voron 2.4 300×300 mm, etc.).
  - Paridade total de informações no modal rápido de visualização (`ModelDetailModal.tsx`) e no Studio 3D (`/models/[id]`).
- **Engine 3D & Extração Nativa de Fatiamento (`v1.8.0`)**:
  - Leitor profundo de `.3mf` (`threemf.ts`) que analisa `project_settings.config`, `model_settings.config` e `plate_*.json` para extrair camada, infill, bico, filamento e faces.
  - Conversor de servidor para arquivos `.3mf` complexos (Bambu Studio, OrcaSlicer, Prusa), convertendo em tempo real e cacheando em formato STL Binário consolidado (`threemf-converter.ts` e `/api/assets/mesh`).
  - Trata o problema clássico de travamento em "100%" causado pelo `DOMParser` do Three.js em arquivos 3MF de mais de 200MB de XML.
  - Orientação correta de impressão (conversão Z-Up para Y-Up com rotação `-Math.PI / 2`, apoiado perfeitamente na mesa a `Y = 0`).
  - Predefinições de câmera: **Iso** (Isométrica), **Frente** (Frontal), **Topo** (Superior) e **Reset**.
  - Materiais de impressão: **PLA**, **ABS**, **PETG (Translúcido)** e **Fosco (Matte)**.
  - Paleta com 12 cores populares de filamento 3D.
  - Medições tridimensionais (Bounding Box em mm) e captura de thumbnail com 1 clique.
- **Scanner Inteligente & Coleções Hierárquicas em Árvore (`v1.9.0`)**:
  - Varre recursivamente pastas locais ou montagens de rede (NFS/CIFS/SMB).
  - **Coleções Hierárquicas (Árvore de Pastas)**: Cada subpasta do disco é mapeada com auto-relacionamento (`parentId` -> `children`) e `folderPath` normalizado no modelo `Collection`.
  - **Atribuição Folha (*Leaf Assignment*)**: Arquivos 3D são atribuídos exclusivamente à coleção da subpasta imediata em que residem (`leafCollection`), evitando duplicatas nas coleções ascendentes.
  - **Espelhamento Físico & Remoção**: Se uma pasta de coleção for deletada fisicamente do disco em `libraries`, o escaneamento remove todos os modelos órfãos e deleta a coleção correspondente em cascata do banco e da interface (`stats.deletedCollections`).
  - **Sincronização Bidirecional**: Criar ou renomear coleções reflete no disco físico (`ensurePhysicalCollectionFolder`, `safeMove`). Itens removidos do disco são deletados do banco.
  - **Prioridade Absoluta para Capas Acompanhantes**: Arquivos de imagem (`.jpg`, `.png`, `.webp`) com o mesmo nome base normalizado são automaticamente priorizados como a thumbnail oficial.
- **Gerenciamento e Limpeza de Cache de Malhas 3D (`v1.9.0`)**:
  - Armazena conversões de STL binário otimizadas de arquivos `.3mf` complexos em `/data/cache/{fileHash}.stl`.
  - Endpoints REST dedicados: `GET /api/cache` (tamanho em bytes e contagem de arquivos) e `DELETE /api/cache` (limpeza segura de arquivos de malhas).
  - Integrado ao painel de telemetria `/metrics` com cards explicativos e modal de confirmação com feedback em tempo real.
- **Opções de Edição do Modelo no Modal e no Studio**:
  - Renomear título inline com persistência imediata (`PUT /api/models/[id]`).
  - Trocar imagem de capa por upload ou por seleção de imagens existentes na pasta (`POST /api/models/[id]/cover`).
  - Enviar e remover manuais de montagem em PDF (`POST` e `DELETE /api/models/[id]/manual`).
- **Terminal de Oficina & Telemetria (`/metrics`)**:
  - Dashboard de bancada preparado para integração Moonraker / Klipper.
  - 4 Cards Bento: Impressões Hoje, Taxa de Sucesso, Consumo de Filamento (kg) e Tempo Ativo.
  - Fila de bancada com status das impressoras e monitoramento de temperatura.
- **Módulo de Precificação & Vendas 3D (`/pricing` - `v1.6.0`)**:
  - **Calculadora Determinística (`src/lib/pricing/calculator.ts`)**:
    - Custo de Energia = `(Potência Watts / 1000) * Horas Impressão * Custo kWh`.
    - Depreciação da Máquina = `(Valor Compra Impressora / Vida Útil Horas) * Horas Impressão`.
    - Custo de Material = `(Custo por kg / 1000) * Peso da Peça em gramas`.
    - Custo de Mão de Obra = `Horas Trabalho Manual (Modelagem + Montagem) * Valor da Hora`.
    - Custos de Acessórios = Soma de `(Preço Unitário * Quantidade)` com inserção dinâmica.
    - Preço Sugerido = `Custo Total * (1 + Markup/100)`.
    - Comparativo de Venda Real = Diferencial entre Preço Sugerido vs. Preço Efetivo Vendido (lucro real, descontos/acréscimos).
  - **Gestão de Orçamentos (`BudgetsTab.tsx`)**:
    - Busca parcial e case-insensitive por nome da peça, cliente ou material.
    - Filtros por abas: Todos, Apenas Orçamentos Abertos e Apenas Vendas Concretizadas.
    - Duplicação com 1 clique (injeta parâmetros na calculadora preservando tempos e margens).
    - Modal analítico de custos e lucro (`BudgetDetailModal.tsx`).
    - Conversão rápida em venda com registro do preço real praticado (`SaleModal.tsx`).
  - **Dashboard & Telemetria Comercial (`DashboardTab.tsx`)**:
    - **Regra Contábil Estrita**: Métricas agregadas exclusivamente sobre registros com `isSale: true` (`/api/pricing/stats?period=month|30days|all`).
    - 6 Bento Cards: Faturamento Real, Custo Total de Produção, Lucro Líquido Real, Margem Média Efetiva, Quantidade de Peças Vendidas e Ticket Médio.
  - **Importador & Exportador de Vendas em CSV (`v1.6.0`)**:
    - Modal de importação (`ImportModal.tsx`) aceitando upload de arquivo `.csv` ou colar diretamente células do Excel (<kbd>Ctrl</kbd> + <kbd>V</kbd>) com autodetecção de separadores (`;`, `,`, `\t`) e conversão de moeda brasileira.
    - Script CLI em lote (`scripts/import-sales.ts`) para ingestão direta via terminal.
    - Exportador de vendas via streaming (`/api/pricing/export?type=sales`) gerando arquivo CSV padronizado para o Excel (ponto e vírgula e UTF-8 BOM).
  - **Configurações Persistentes da Oficina (`SettingsTab.tsx`)**:
    - Configurações da máquina (valor de compra, consumo W, vida útil h, kWh, taxa horária manual e markup padrão) salvas em `PrinterSettings`.
    - Catálogo persistente e reutilizável de filamentos em `PrintMaterial` (nome, custo por kg, densidade).
- **Autenticação, Proxy e Controle de Acesso Baseado em Papéis (RBAC - `v1.9.1`)**:
  - Matriz de perfis unificada: `ADMIN`, `OPERATOR`, `VIEWER`.
  - **Somente Administrador**: Acesso restrito a `/users` e `/api/users/*`, criação e gerenciamento de contas, mapeamento de pastas físicas do NAS (`/libraries`) e limpeza do cache de malhas do disco do servidor.
  - **Operador & Administrador**: Upload de arquivos STL/3MF/ZIP, movimentação de peças entre coleções no disco, edição de parâmetros técnicos, envio de manuais PDF, marcação de peças impressas e escaneamento.
  - **Todos Autenticados**: Visualização 3D Three.js, streaming de malhas e arquivos originais, catálogo de coleções e calculadora de precificação.
  - **Next.js 16 Proxy (`proxy.ts`)**: Validação de sessão JWT sem loop de redirecionamento para não-administradores e bloqueio pontual em rotas administrativas.
- **Reorganização Estrutural da Barra Lateral (`Sidebar.tsx`)**:
  - Nova categoria **Calculadora** apontando para `/pricing`.
  - Nova categoria **Métricas** agrupando *Métricas dos Arquivos* (`/metrics`) e *Métricas de Vendas* (`/pricing?tab=dashboard`).
  - Categoria **Configurações** agrupando *Mapear Pastas & Scan* (`/libraries`) acima de *Gestão de Usuários* (`/users`).
- **Nova Identidade Visual Neon & Favicon Multi-Resolução (`v1.6.0`)**:
  - Emblema neon isométrico em [public/logo.png](file:///swarm/stl/public/logo.png) com transparência alfa de alta definição (32-bit RGBA) sem fundo falso.
  - Arquivo nativo multi-resolução `favicon.ico` (16x16, 32x32, 48x48, 64x64 px) em [public/favicon.ico](file:///swarm/stl/public/favicon.ico) e [src/app/favicon.ico](file:///swarm/stl/src/app/favicon.ico), integrado aos metadados do Next.js App Router em [layout.tsx](file:///swarm/stl/src/app/layout.tsx).
  - Remoção de poluidores visuais: subtítulo sob a logo e badge numérico da Navbar superior.
- **Download Resiliente de Arquivos 3D, Fallback de Caminhos & Hardening de CI/CD (`v1.7.2`)**:
  - **Entrega Resiliente de Arquivos (`/api/assets/file` e `/api/assets/mesh`)**:
    - Algoritmo de resolução inteligente com busca em fallback: se o arquivo não estiver presente no caminho exato registrado na biblioteca (`library.path`), o backend busca automaticamente em `STORAGE_LIBRARIES_PATH` (`/libraries`) e `STORAGE_DATA_PATH` (`/data`).
    - Prevenção ativa de erros `404 Not Found` caso volumes Docker sejam montados ou reconfigurados.
  - **Padronização RFC 6266 / RFC 5987 para Content-Disposition**:
    - Implementação de `filename="..."` (ASCII higienizado) + `filename*=UTF-8''...` (codificado sem quebrar espaços ou acentos).
    - Inclusão mandatória de `&download=true` nos links de download de arquivos 3D e botão dedicado para baixar manuais PDF tanto em [src/app/models/[id]/page.tsx](file:///swarm/stl/src/app/models/[id]/page.tsx) quanto em [src/components/model/ModelDetailModal.tsx](file:///swarm/stl/src/components/model/ModelDetailModal.tsx).
  - **Hardening do Pipeline CI/CD GitHub Actions (`.github/workflows/publish.yml`)**:
    - Auditoria de dependências com `npm audit --audit-level=high` (tolerante).
    - Execução de testes com `npm test --if-present`.
    - Escaneamento de vulnerabilidades em contêineres com **Trivy Action**.
    - Assinatura criptográfica keyless de contêineres no GHCR via **Cosign** com permissão OIDC `id-token: write`.

- **Scanner Diferencial Incremental, Paginação & Estúdio em Coleções (`v1.7.1`)**:
  - **Crawler Diferencial de Alta Performance (`src/lib/scanner/crawler.ts`)**:
    - O crawler compara em memória o hash dos arquivos (`${mtimeMs}_${size}`), contagem de assets e metadados com os registros existentes.
    - Modelos e arquivos sem modificação no disco são saltados instantaneamente (`stats.unchangedModels++`), eliminando re-parsing desnecessário de malhas STL/3MF e dezenas de transações Prisma.
    - Geometrias e metadados só são reextraídos se o carimbo de alteração em disco (`mtimeMs`) tiver mudado.
  - **Scan Direcionado por Coleção (`POST /api/collections/[id]/scan`)**:
    - Nova rota que mapeia a pasta física da coleção em disco e executa o scan incremental estritamente dentro daquele escopo (`options.subFolder`), restringindo a limpeza de órfãos apenas àquela subpasta.
    - Botão "Escanear Pasta" interativo no cabeçalho da página de detalhes da coleção (`/collections/[id]`).
  - **Detecção de Capas por Correspondência de Nome Base (`src/lib/scanner/extractors/companion.ts`)**:
    - Prioridade de primeiro nível para imagens (`.png`, `.jpg`, `.jpeg`, `.webp`, `.avif`, `.bmp`, `.tiff`) que compartilham o mesmo nome base exato ou normalizado do arquivo 3D ou do diretório do modelo.
  - **Barra de Ferramentas / Filtros Eagle em Coleções (`/collections/[id]`)**:
    - Integração de `FilterBar` com visualização em Grid Grande (com slider de zoom dinâmico), Grid Compacto e Tabela detalhada.
    - Filtros por favoritos, status de impressão, formatos (`.3MF`, `.STL`, `.STEP`, `.OBJ`, `.GCODE`) e polímeros (`PLA`, `PETG`, `ABS/ASA`, `TPU`).
  - **Paginação Dinâmica Sem Limites Arbitrários (`src/components/gallery/PaginationBar.tsx`)**:
    - Removido o teto de 100 da rota `/api/models`, adicionado suporte a `limit=all` (até 10.000) e paginação completa (24, 48, 96, 192 e "Todos").
  - **Refinamento de Layout e UX do Modal e Modo Studio**:
    - Caminho da pasta 100% completo com quebra contínua (`break-all`), sem cortes nem reticências (`...`).
    - Remoção de telemetria estática / simulada na barra superior do Modo Studio 3D (`OFICINA [CONECTADA] | MESA: 60°C BICO: 215°C`), com navegação contextual `router.back()`.

- **Backup, Restauração, Varredura Assíncrona & Design System Resiliente (`v1.17.0`)**:
  - **Restauração e Sincronização do Banco de Dados (`/api/database/restore`)**:
    - Suporta restauração idempotente via `upsert` com resolução de dependências hierárquicas em duas passagens para coleções (evitando violações de foreign key).
    - Serialização de `BigInt` segura em JSON (`BigInt.prototype.toJSON`) para prevenir quebras durante backup de malhas e arquivos grandes.
    - Gestão de snapshots salvos em `/data/backups/` com tabela interativa em `/metrics` e deleção com proteção de path traversal (`/api/database/backups/[filename]`).
  - **Varredura Global Assíncrona (`/api/scan/all`)**:
    - Dispara crawler em segundo plano e retorna `HTTP 202` imediatamente, substituindo loop síncrono no navegador e evitando timeout de rede.
  - **Integridade de Coleções & Prevenção de Perda de Dados (P0)**:
    - Exclusão de coleções (`/api/collections/[id]`) desvincula modelos por padrão e não remove pastas físicas a menos que `?deleteFiles=true` seja passado explicitamente.
  - **Design System: Erradicação de Alertas e Diálogos Nativos**:
    - `ToastProvider` (`src/components/ui/ToastContext.tsx`) e `<ConfirmDialog>` (`src/components/ui/ConfirmDialog.tsx`) padronizados com tema dark glassmorphic Stitch, eliminando 100% dos `alert()` e `confirm()` nativos da aplicação.
  - **Otimização de Banco de Dados**:
    - Índices criados no PostgreSQL: `Model(filamentType)`, `ModelFile(format, fileHash)`, `PrintBudget(isSale, soldAt)`.
  - **UX & Responsividade Mobile**:
    - Skeletons animados no carregamento da galeria, contenção de largura de grid em telas pequenas e docking ergonômico da barra de ações em lote.

    - Agrupamento dos metadados de tamanho do arquivo (`formatBytes`) à esquerda na miniatura e passagem do botão Studio via `headerAction` no `ModelViewer3D`, eliminando sobreposições.

- **Navegação & Carregamento 3D sob Demanda (`v1.7.0`)**:
  - **Reordenação da Barra Lateral (`Sidebar.tsx`)**: O item **"Modelos 3D"** foi reposicionado no topo da seção *Repositórios Locais*, antes de **"Coleções"**, garantindo acesso direto ao catálogo completo de arquivos do repositório enquanto preserva o dropdown de coleções.
  - **Visualização sob Demanda da Malha 3D (`ModelViewer3D.tsx`)**: Ao abrir qualquer arquivo ou modelo (no modal de detalhes ou estúdio 3D), o Three.js não inicia o download nem a extração automática de malhas pesadas (.stl, .3mf, .obj).
  - **Miniatura Inicial com Metadados**: Exibição da thumbnail nítida do projeto com badges de formato (`.STL`, `.3MF`, etc.) e cálculo do peso total em KB/MB.
  - **Botão "Carregar Malha 3D"**: Inicialização do WebGL e renderização interativa sob demanda pelo usuário, com barra de progresso em tempo real.
  - **Alternância Flexível "Ver Miniatura"**: Botão na barra superior para descarregar o WebGL e retornar à miniatura 2D a qualquer momento, poupando memória e GPU.
- **Mapear Pastas & Central AdditiveCore (`/libraries`)**:
  - Monitoramento de volume RAID 5, hash monitor e logs em tempo real do crawler.
- **Gestão Completa de Usuários & Controle de Acesso (`/users` - `v1.5.0`)**:
  - Criação e edição dos 5 campos de usuário: **Nome Completo**, **Foto de Perfil (Avatar)**, **Senha**, **E-mail** e **Perfil / Nível de Acesso** (`ADMIN`, `USER / Operador` e `VIEWER / Visualizador`).
  - Helper `processAvatar` (`src/lib/users/avatar.ts`): converte uploads Base64 (PNG, JPG, WebP) em imagens físicas salvas no disco em `/data/thumbnails/avatar_{id}_{timestamp}.{ext}` e servidas via `/api/assets/thumbnails/`.
  - Rota dinâmica dedicada `src/app/api/users/[id]/route.ts` com suporte a `GET`, `PUT` e `DELETE`, além de `POST` e compatibilidade em `src/app/api/users/route.ts`.
  - Validação estrita de unicidade de e-mail (409 Conflict) e preservação de senha atual quando o campo for deixado em branco na edição.
  - O avatar é integrado ao token JWT (`UserSession`) e renderizado dinamicamente no menu lateral (`Sidebar.tsx`) e na tabela de usuários.
- **Sistema de Coleções & Gestão Física no Disco (`v1.4.0`)**:
  - Toda coleção criada no banco possui pasta física correspondente no repositório (`ensureCollectionFolder`).
  - **Movimentação em Lote**: Endpoint `POST /api/models/move` e tela `/collections/[id]` com seleção múltipla e barra flutuante. Move fisicamente no disco o arquivo 3D principal, imagens de capa/renders e manuais em PDF.
  - **Renomeação Física**: Endpoint `PUT /api/models/[id]` renomeia fisicamente o arquivo 3D, a imagem de capa e o manual PDF na pasta do repositório (`renameModelFiles`).
  - **Prevenção de Sobrescrita**: Colisões de nome no disco geram sufixo numérico incremental (ex: `Modelo (1).3mf`), preservando ambos os arquivos no disco e no Prisma (`getAvailablePath`).
  - **Upload via Link (Download por URL)**: Endpoint `POST /api/upload/url` e aba no `UploadModal.tsx` para baixar arquivos 3D e pacotes `.zip` diretamente para a coleção e pasta física **`download`**.
- **Segurança & Proteção de Rotas**:
  - Proxy Next.js 16 em `src/proxy.ts` exigindo autenticação para todas as páginas e rotas de API (com exceção de `/api/health`, `/api/auth/login`, `/login`).
  - Suporte completo a Cookie de sessão (`pv_session`), `Bearer Token` e `Basic Auth` com perfil `ADMIN`.
- **Upload Manual de Arquivos**:
  - Interface Drag & Drop integrada (`UploadModal.tsx`) com abas para arquivo local ou link da internet.
- **Controle de Impressões (Check de Impressos & Filtro de Nunca Impressos)**:
  - Campos `isPrinted` e `printedAt` tanto em `Model` quanto em `ModelFile`.
  - Botão de toggle rápido com 1 clique diretamente no card da galeria (`[ ○ Não impresso ]` ⟷ `[ ✓ Impresso ]`).
  - Abas de filtragem na galeria: **Todos**, **Nunca Impressos** e **Já Impressos**.
- **Health Check & Monitoramento**:
  - Rota `/api/health` conectada ao PostgreSQL e monitorada nativamente pelo Docker Compose.
- **Provisionamento Dinâmico no Primeiro Boot (`v1.5.1`)**:
  - **Auto-criação no PostgreSQL**: Ao iniciar com volume vazio, o container `db` (`postgres:16-alpine`) cria o usuário (`POSTGRES_USER`), senha (`POSTGRES_PASSWORD`) e database (`POSTGRES_DB`) informados no Compose.
  - **Sincronização Automática de Tabelas**: O container `web` aguarda o banco estar saudável (`pg_isready`) e executa `prisma db push --skip-generate` apontando dinamicamente para a `DATABASE_URL` construída pelas variáveis do Compose.
  - **Seed Automático de Administrador**: O script `docker-entrypoint.sh` verifica e cria o usuário administrador padrão (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) caso ainda não exista no banco.
  - **Resiliência de Variáveis**: Sintaxe `${VAR:-default}` no `docker-compose.yml` garante que a aplicação suba sem falhas mesmo na ausência de arquivo `.env`.
- **CI/CD & Publicação Automática (GitHub Actions - `v1.6.0`)**:
  - Workflow em `.github/workflows/publish.yml` ativado em pushes para `main` e tags `v*`.
  - Baseado em **Node.js 22 LTS** tanto no runner do GitHub Actions quanto na imagem base do `Dockerfile` (`node:22-alpine`), prevenindo alertas de depreciação do Node 20.
  - Autenticação configurada via Secret **`GHCR_TOKEN`** para login no GitHub Container Registry (`ghcr.io/cpginfo/martins3dvault`) e criação de releases via `softprops/action-gh-release`.
  - Executa validação prévia de TypeScript e compilação do Next.js antes de qualquer publicação.
  - Compila e publica automaticamente a imagem Docker com suporte a cache GitHub Actions (`mode=max`).
  - Criação automática de GitHub Releases para tags de versão (`v*`).

- **Sistema de Temas Dark & Light Dinâmico (`v1.5.5`)**:
  - Contexto React `ThemeContext` (`src/lib/theme/ThemeContext.tsx`) com persistência em `localStorage` (`pv_theme`) e sincronização de classes `html.dark` / `html.light`.
  - **Script Anti-FOUC no `<head>`**: Avalia `localStorage` antes do primeiro paint para impedir qualquer piscamento de tela (flash of unstyled content).
  - **Light Mode Calibrado & Contraste WCAG AAA**:
    - Fundo global `surface`: `#f1f5f9` (Slate 100), apoio `surface-container-low`: `#f8fafc` (Slate 50).
    - Cards e formulários `surface-container-lowest`: `#ffffff` (Branco puro) com bordas técnicas `#e2e8f0` (Slate 200).
    - Títulos `#0f172a` (Slate 900), labels técnicos `#475569` (Slate 600), hashes/logs `#64748b` (Slate 500).
    - Laranja primário `#ea580c` (Orange 600, contraste 4.5:1+), Azul Sky `#0284c7`, Online Emerald `#16a34a`.
  - **Mesa 3D Híbrida**: Alternador no Three.js entre **Estúdio Claro** (fundo `#f8fafc` e grid `#cbd5e1`) e **Dark Canvas Híbrido** (`#0b0e17`).

---

## 2. Stack Tecnológica & Versões Ativas

- **Versão do Aplicativo**: `v1.7.0` (configurada centralmente no `package.json`).
- **Framework & Runtime**: Next.js 16.3.5 (App Router, Node.js 22 LTS).
- **UI Library & Styling**: React 19.2.8, Tailwind CSS v4 (`@theme` tokens do Google Stitch), Lucide React & Google Material Symbols Outlined.
- **Motor 3D**: Three.js v0.183+ (`STLLoader.js`, `ThreeMFLoader.js`, `OBJLoader.js`, `OrbitControls.js`).
- **Banco de Dados & ORM**: PostgreSQL 16 com Prisma ORM v6.19 (LTS).
- **Autenticação**: JWT sem estado baseado em cookies seguros via `jose` e `bcryptjs`.
- **Parsing de Arquivos**: `adm-zip` para inspeção e descompactação de 3MF, parser customizado para STL binário/ASCII e montagem de transformações afins.
- **Containerização**: Docker multi-stage com `node:22-alpine` e Next.js Standalone, `docker-compose.yml` (`3d-vault-web` e `3d-vault-db`) e rede externa `qg`.
- **Demonstração & Capturas**: Pasta `screenshots/` versionada no GitHub e incorporada como galeria responsiva com miniaturas no `README.md`.
- **Integração Google Stitch**: MCP Server (`@_davideast/stitch-mcp proxy`) configurado em `.agents/mcp_config.json`.

---

## 3. Armadilhas Comuns & Convenções Críticas

### A. Next.js 15/16 App Router - `params` Assíncronos
Em rotas dinâmicas do App Router (`api/.../[id]/route.ts` ou páginas `[id]/page.tsx`), a propriedade `params` é uma **Promise**.
Sempre use:
```typescript
export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  // ...
}
```

### B. Serialização de `BigInt` do Prisma
O campo `fileSize` no modelo `ModelFile` e `ModelAsset` é do tipo `BigInt` no Prisma. O método `JSON.stringify` nativo do JavaScript falha com erro `TypeError: Do not know how to serialize a BigInt`.
**Regra**: Em qualquer rota de API que retorne `fileSize`, converta explicitamente para `Number(file.fileSize)` antes de enviar o `NextResponse.json()`.

### C. Carregamento de Arquivos 3MF Pesados (Evitar DOMParser no Cliente)
Arquivos `.3mf` do Bambu Studio ou OrcaSlicer expandem para mais de 200MB de XML puro (`3D/Objects/object_*.model`).
**Solução**: O Three.js no cliente **NÃO** deve usar `ThreeMFLoader` diretamente em arquivos gigantes.
Em vez disso, a rota `/api/assets/mesh` converte o 3MF para STL Binário no servidor, armazena em cache em `/data/cache/{fileHash}.stl` e serve via streaming de 1MB. O cliente consome via `STLLoader` em ~200ms com zero congelamento da interface.

### D. Orientação de Malhas 3D (Z-Up para Y-Up)
Softwares de fatiamento 3D exportam arquivos STL e 3MF com o eixo Z como altura (Z-Up). No Three.js o eixo vertical é Y (Y-Up).
Ao carregar a malha, rotacione `-90°` no eixo X (`rotation.x = -Math.PI / 2`), chame `updateMatrixWorld(true)`, e apoie a base do modelo na mesa em `Y = 0`.

### E. Normalização de Nomes para Capas Acompanhantes
Arquivos podem ter variações como `Caneca FLAMENGO..3mf` (dois pontos) e `Caneca Flamengo.jpg`. Use sempre a função `normalizeBaseName()` em [companion.ts](file:///swarm/stl/src/lib/scanner/extractors/companion.ts) que remove acentos, múltiplos pontos e converte para minúsculas para garantir 100% de precisão na correspondência.

### F. Prisma 6 CLI no Docker Next.js Standalone
O modo `output: "standalone"` remove utilitários de CLI. No Prisma 6, a CLI exige `@prisma/config` e `effect`.
**Solução no Dockerfile**:
1. Instalar o Prisma globalmente no runner: `RUN npm install -g prisma@6.19.3`.
2. Copiar o pacote `bcryptjs` completo de `deps`: `COPY --from=deps /app/node_modules/bcryptjs ./node_modules/bcryptjs`.
3. Executar o sync via `prisma db push --skip-generate` no entrypoint.

### G. Conflito de Portas no Docker ao Renomear Containers
Ao alterar `container_name` no `docker-compose.yml` (por exemplo, de `printvault-web` para `3d-vault-web`), os containers antigos não são automaticamente removidos por um simples `docker compose up`.
**Regra**: Sempre pare os containers antigos com `docker rm -f <nome-antigo>` antes de subir novos containers com bind na mesma porta `3000`.

### H. Tokens do Google Stitch com Tailwind CSS v4
No Tailwind v4, os tokens personalizados do Stitch estão definidos via `@theme` em `src/app/globals.css`:
- `bg-surface`, `bg-surface-container-low`, `bg-surface-container-high`
- `text-primary-container` (`#f97316`)
- `text-secondary` (`#4cd7f6`)
- `text-tertiary` (`#4edea3`)
- `border-outline-variant` (`#414752`)

### I. Ligaturas Quebradas no Material Symbols vs Lucide React
O *Material Symbols* do Google depende de ligaturas de texto para renderizar ícones. Se um nome de ícone não existir exatamente no catálogo (ex: `folder_minus`), o motor de fontes do navegador substitui apenas o prefixo correspondente (`folder` -> 📁) e imprime o restante como texto literal (`_minus` -> `_MINUS`), quebrando a interface.
**Regra**: Para botões de ação e ícones compostos, prefira sempre importar componentes SVG nativos do `lucide-react` (ex: `FolderMinus`, `Layers`, `Box`), garantindo renderização vetorial determinística e sem falha de ligatura.

### J. Manipulação Segura de Arquivos em Volumes Docker (`file-ops.ts`)
Nunca use `fs.promises.rename` direto sem tratamento para operações entre diretórios montados por volumes diferentes (como `./data` e `./libraries`), pois isso pode disparar o erro do sistema operacional `EXDEV: cross-device link not permitted`.
**Regra**: Utilize sempre a função `safeMove` de [file-ops.ts](file:///swarm/stl/src/lib/storage/file-ops.ts), que realiza fallback automático de cópia recursiva e exclusão do original. Além disso, sempre consulte `getAvailablePath` antes de mover ou renomear para garantir a política de preservação de arquivos duplicados através de sufixos numéricos (`(1)`).

### K. Inicialização Automática de Banco, Migrações e Tabelas no Docker
O container PostgreSQL (`postgres:16-alpine`) só executa `initdb` com usuário e banco quando o volume `postgres_data` estiver vazio. Se o volume já existir com credenciais antigas, o Postgres não recria o usuário/database.
No container `web`, a diretiva `depends_on: db: condition: service_healthy` garante que a aplicação só sobe após o `pg_isready` responder com sucesso. O script `docker-entrypoint.sh` então extrai os parâmetros dinâmicos de `DATABASE_URL` e executa migrações formais versionadas através de `prisma migrate deploy`, contando com auto-baseline inteligente (`0_init`) caso detecte bancos legados populados anteriormente via `db push`. Em seguida, realiza a inserção/validação do usuário administrador único parametrizado no Compose (`ADMIN_EMAIL`/`ADMIN_PASSWORD`). Nenhum usuário secundário deve ser provisionado ou verificado via script de boot; a criação, edição e ciclo de vida de operadores pertencem estritamente à interface web e ao banco de dados.

### L. Carregamento sob Demanda no Three.js & Gestão de Memória GPU
Em versões anteriores, a malha 3D começava o download imediatamente ao abrir qualquer modelo, consumindo banda e GPU mesmo quando o usuário só desejava checar notas ou alterar metadados.
**Regra**: O componente `ModelViewer3D` deve sempre iniciar com `meshLoaded: false`, exibindo a thumbnail oficial com badges de extensão e tamanho. Apenas quando o usuário clicar explicitamente em **"Carregar Malha 3D"** o canvas WebGL e os loaders (`STLLoader`, `ThreeMFLoader`, `OBJLoader`) são acionados. Ao alternar para miniatura ou trocar de modelo (`modelId`), os recursos (`renderer.dispose()`, remoção de geometrias e cancelamento de `animationFrame`) devem ser liberados imediatamente para evitar vazamento de memória e exaustão de contextos WebGL do navegador.

### M. Permissões de Volume de Cache no Host (`/data/cache`)
O container executa como usuário não-root `nextjs` (UID 1001). Ao montar o volume `./data:/data`, pastas criadas previamente pelo Docker ou pelo host como `root:root` com máscara `755` causam erro `EACCES: permission denied, unlink` quando o endpoint `DELETE /api/cache` tenta excluir os arquivos de cache.
**Regra**: Assegure que as pastas em `data/` e `data/cache/` tenham permissão de leitura/escrita para o usuário da aplicação (`chmod -R 777 data/cache` ou `chown -R 1001:1001 data/cache`).

### N. Redefinição Administrativa com `ADMIN_FORCE_RESET`
Se a senha do administrador padrão for alterada ou esquecida, o script `docker-entrypoint.sh` permite forçar o reset definindo a variável de ambiente `ADMIN_FORCE_RESET=true`. Nesse modo, a senha é sobrescrita com `ADMIN_PASSWORD` (criptografada via bcrypt) durante a inicialização do container.

### O. Controle de Concorrência de Downloads & Proteção contra Exaustão de Recursos
Endpoints que realizam entrega de arquivos pesados e conversões intensivas no CPU (`/api/assets/file` e `/api/assets/mesh`) possuem limites rígidos de concorrência gerenciados em `src/lib/security/concurrency-limiter.ts`:
1. **Limite por Usuário**: Máximo de **3 downloads/conversões simultâneas** por `userId`. O 4º download simultâneo recebe `HTTP 429` imediatamente com a mensagem `"Limite de downloads simultâneos atingido (máx. 3). Aguarde um dos downloads em andamento finalizar."`.
2. **Limite Global**: Teto máximo de **15 downloads/conversões simultâneas** em todo o processo para impedir que múltiplos usuários saturem a CPU do host.
3. **Lock Single-Flight por Arquivo (`getOrConvertMesh`)**: Se mais de uma requisição simultânea solicitar a conversão de um mesmo arquivo `.3mf` para STL binário, todas aguardam a MESMA Promise em vez de duplicar carga na CPU.
4. **Isolamento de Rotas Críticas**: O limitador aplica-se **exclusivamente** às rotas pesadas `/api/assets/file` e `/api/assets/mesh`. Rotas de navegação, catálogo (`/api/models`), coleções (`/api/collections/*`), miniaturas (`/api/assets/thumbnails/*`) e autenticação permanecem 100% livres de bloqueio concorrente para não degradar a experiência do usuário.
5. **Throttling de Banda e Circuit Breaker**: O streaming suporta limitação de vazão via `DOWNLOAD_THROTTLE_MBPS` (padrão 10 MB/s), e usuários que atingirem o limite 429 repetidamente (10 vezes em 5 minutos) são colocados em quarentena temporária de 15 minutos via Circuit Breaker.
**Regra**: Nunca remova ou desative esses limites em `/api/assets/file` ou `/api/assets/mesh` sem implementar proteção equivalente a nível de infraestrutura (ex: rate limiting no reverse proxy).

### P. Varredura Diferencial de Inicialização & Extração Profunda de .3mf (`v1.13.0`)
Quando o container é iniciado ou reiniciado, o sistema dispara automaticamente uma varredura diferencial de todas as bibliotecas ativas:
1. **Hook Nativo Next.js (`src/instrumentation.ts`)**: Utiliza `register()` no runtime Node.js, executado de forma desacoplada após 2 segundos de inicialização. Isso garante que a porta 3000 abra imediatamente e o Docker Healthcheck passe sem nenhum atraso.
2. **Scan Estritamente Diferencial (`src/lib/scanner/crawler.ts`)**: Modificações e novos arquivos são processados. Arquivos `.3mf` antigos sem metadados extraídos são identificados e re-parseados, gravando `mimeType: "model/3mf"`. Nas reinicializações seguintes, arquivos já inspecionados são pulados em milissegundos (`=38 inalterados`).
3. **Extração Profunda de .3mf (`src/lib/scanner/extractors/threemf.ts`)**: Extrai parâmetros de fatiamento (`filamentType`, `layerHeight`, `nozzleSize`, `infillDensity`), contagem de triângulos, miniaturas em `Auxiliaries/` e dimensões tridimensionais milimétricas (X, Y, Z via `plate_*.json` ou cálculo de bounding box nos vértices).
4. **Exclusão de Diretórios CACHE/cache**: Pastas de cache (`IGNORED_DIRS`) são terminantemente ignoradas para evitar criação de coleções espúrias.

### Q. Experiência Mobile & Rolagem do Visualizador de Modelos (`v1.13.1`)
O visualizador rápido de modelos ([`ModelDetailModal.tsx`](file:///swarm/stl/src/components/model/ModelDetailModal.tsx)) e o visualizador 3D Three.js ([`ModelViewer3D.tsx`](file:///swarm/stl/src/components/viewer3d/ModelViewer3D.tsx)) foram adaptados para dispositivos móveis e telas de toque:
1. **Seletor de Abas Mobile Dedicado**: Em telas `< md` (abaixo de 768px), o layout elimina a partição 42%/58% vertical (que espremia o visualizador e a barra de rolagem) e introduz alternância instantânea entre `Visualizador 3D` (tela cheia para OrbitControls, rotação, zoom por pinça e seleção de materiais) e `Ficha & Arquivos` (tela cheia para parâmetros técnicos, arquivos e notas).
2. **Body Scroll Lock**: Ao abrir o modal, `document.body.style.overflow = "hidden"` previne rolagem indesejada do catálogo ao fundo no iOS/Android.
3. **Rolagem Fluida sem Scroll Traps**: A Ficha Técnica mobile rola como uma superfície contínua unificada (`overflow-y-auto overscroll-contain`) com abas técnicas fixas (`sticky top-0 backdrop-blur-md`), permitindo rolagem com o polegar a partir de qualquer ponto da tela.
4. **Altura Mínima Responsiva**: `min-h-[420px]` foi substituído por `min-h-[260px] sm:min-h-[350px] md:min-h-[420px] touch-none` para evitar distorções no mobile landscape e corte do botão de carregamento da malha 3D.

### R. Monitoramento de Varredura em Tempo Real & Histórico Expandido (`v1.14.0`)
1. **Redirecionamento ao Clicar em "Escanear Agora" (`src/components/layout/Navbar.tsx`)**: O botão de varredura global aciona `router.push("/metrics")` imediatamente, levando o operador na hora para a tela de Métricas com o evento `scanStatusChanged`.
2. **Gerenciador de Progresso Singleton em Memória (`src/lib/scanner/scan-progress.ts`)**: Armazenado em `globalThis` no runtime Node.js, rastreia em tempo real as fases `DISCOVERING` (descoberta de pastas e arquivos no disco) e `PROCESSING` (verificação diferencial, hashes, extração de capas e metadados). Fornece porcentagem dinâmica calculada (0 a 100%), nome do arquivo/modelo sob análise e contagem de itens em microssegundos sem consultas repetidas ao banco de dados.
3. **Barra de Progresso Visual em `/metrics` (`src/app/metrics/page.tsx`)**: Card integrado diretamente no topo da seção "Histórico Recente de Varreduras", com polling reativo enquanto ativo e transição para estado de sucesso (100% verde) por 20 segundos após a conclusão, acionando o recarregamento instantâneo do histórico e dos números gerais.
4. **Histórico com Varreduras Automáticas (Boot) e Manuais (`src/lib/scanner/startup-scan.ts` e `crawler.ts`)**:
   - O campo `log` do `ScanJob` no banco registra `[STARTUP]` para varreduras disparadas pelo contêiner no boot e `[MANUAL]` para varreduras manuais.
   - O endpoint `/api/stats` expandiu o histórico para até 20 registros e expõe o campo `trigger`.
   - A tabela do histórico renderiza badges visuais `⚡ Automática (Boot)` (em ciano) e `👤 Manual` (em laranja), detalha balanço de alterações (`+novos`, `~alterados`, `-removidos`) e calcula a duração da varredura.

### S. Coleções Avançadas, UX Desktop, Exclusão Física & Resiliência 429 (`v1.15.0`)
1. **Coleções Apenas com Arquivos 3D & Isolamento de Cache (`src/lib/scanner/crawler.ts`)**:
   - O diretório `cache` foi removido de `IGNORED_DIRS` genérico; o crawler agora ignora exclusivamente a pasta resolvida em `STORAGE_DATA_PATH/cache`.
   - Coleções e subpastas só são criadas se contiverem arquivos 3D (`.stl`, `.3mf`, `.obj`, `.step`, `.stp`). Pastas sem arquivos 3D são automaticamente descartadas e limpas do banco.
2. **Modo Lista & Controles na Árvore de Coleções (`src/app/collections/page.tsx`)**:
   - Adicionada opção de exibição por **Lista** com tabela completa (capa, link, caminho no disco, arquivos 3D, subpastas, descrição e ações).
   - Botões **Recolher Todos** e **Expandir Todos** com propagação recursiva em cascata via `expandAllSignal`.
3. **Barra Lateral (Sidebar) Redimensionável no Desktop (`Sidebar.tsx`, `Navbar.tsx`, `globals.css`)**:
   - Drag handle vertical interativo na borda direita da Sidebar (`cursor-col-resize`), ajustável entre 220px e 600px com restauração em duplo clique e persistência em `localStorage`.
   - Classes utilitárias `@media (min-width: 1024px)` (`sidebar-width-dynamic`, `sidebar-left-dynamic`, `sidebar-pl-dynamic`) via CSS Variable `--sidebar-width`, mantendo 60 FPS e mobile 100% preservado.
4. **Exclusão Física Automática no Disco (`src/lib/storage/file-ops.ts` e `collections/[id]/route.ts`)**:
   - Função `deleteCollectionFolder` que remove fisicamente a pasta no disco do armazenamento ao deletar a coleção, com validação anti-Path Traversal e proteção de coleções reservadas (`download`).
5. **Contador Recursivo de Arquivos 3D (`collections/route.ts` e `collections/[id]/route.ts`)**:
   - Algoritmo de memoização $O(N)$ somando arquivos diretos e de todas as subpastas da coleção recursivamente.
6. **Resolução de Erro 429 & Otimização do Limitador de Concorrência (`src/lib/security/concurrency-limiter.ts` e `api/assets/file`)**:
   - Isenção total de imagens de preview do limitador de download.
   - Limites ampliados para ADMIN (30), OPERATOR (16), USER (8) e Global (30).
   - Imunidade para ADMIN e OPERATOR no Circuit Breaker, e rota `POST /api/security/circuit-breaker/reset` com botão "Liberar" na interface de Métricas.

### T. Padrão OPC/Windows Explorer para Capas 3MF, Alta Fidelidade & Cache-Busting (`v1.16.0`)
1. **Parser Oficial de Miniaturas OPC / Windows Explorer (`src/lib/scanner/extractors/threemf.ts`)**:
   - Criação da função especializada `findThreeMfThumbnailEntry` que inspeciona o arquivo de relações `_rels/.rels` em conformidade com o padrão Open Packaging Conventions (ISO/IEC 29500-2).
   - Identifica o relacionamento `http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail` (usado nativamente pelo Windows Explorer).
2. **Resolução de Miniaturas de Alta Fidelidade (Bambu Studio & OrcaSlicer)**:
   - Em pacotes que apontam para `thumbnail_3mf.png` (240x240), o sistema busca e prioriza automaticamente `thumbnail_middle.png` (680x680) presente na pasta `.thumbnails/`.
   - Suporte a metadados de capa do designer (`DesignerCover` e `ProfileCover` em `3d/3dmodel.model`).
   - Fallback hierárquico estruturado: capas reais do projeto > renders de fatiamento de placas (`plate_1`, `plate_N`).
3. **Cache-Busting com Versionamento MD5**:
   - Sufixo `?v={hash}` de 8 caracteres adicionado nas URLs de miniaturas (`/api/assets/thumbnails/{modelId}_thumb.png?v=...`) derivado do buffer da imagem, garantindo atualização visual imediata no navegador.
4. **Re-scan Diferencial com Atualização Automática de Capas Legadas (`src/lib/scanner/crawler.ts`)**:
   - O crawler identifica miniaturas legadas sem versionamento (`isLegacyThumb`) e re-extrai automaticamente as capas no novo padrão de alta definição durante os scans diferenciais normais.

### U. Download ZIP, Ações em Massa, Índices e Backup do Banco (`v1.17.0`)
1. **Download de Modelos Multi-Peças em ZIP Único (`src/app/api/models/[id]/download-zip/route.ts`)**:
   - Compactador em memória baseado em `adm-zip` com buffer convertido para `Uint8Array` para compatibilidade com Web Fetch API do Next.js.
   - Empacota todos os arquivos de malhas, PDFs manuais e imagens de capa vinculadas.
   - Integrado ao semáforo de concorrência (`acquireDownloadSlot`) e audit log de downloads.
   - Botões na UI em `ModelDetailModal.tsx` e Studio 3D (`/models/[id]/page.tsx`).
2. **Ações em Massa e Seleção em Lote na Galeria (`/api/models/batch`, `BatchActionBar.tsx`)**:
   - Modo de seleção ativado no botão da `FilterBar` com checkboxes e seleção nos modos Grade e Tabela (`ModelCard.tsx`).
   - Barra flutuante `BatchActionBar` com contador de seleção, marcar impresso/não impresso, favoritar/desfavoritar, mover para coleção (com modal hierárquico) e exclusão em lote.
   - Endpoint transacional `POST /api/models/batch` com validação de permissões RBAC (`ADMIN`/`OPERATOR`).
3. **Otimização Extrema de Banco de Dados PostgreSQL & CTE Recursiva**:
   - Índices adicionados no `schema.prisma`: `Model(collectionId, isFavorite, isPrinted, createdAt)` e `Collection(name)`.
   - Consulta de subcoleções em `src/app/api/models/route.ts` migrada para CTE PostgreSQL nativo `WITH RECURSIVE subcolls AS (...)`, reduzindo N queries para 1 round-trip.
4. **Backup, Restauração e Gestão de Snapshots (`/api/database/backup`, `/api/database/restore`, `/api/database/backups`)**:
   - Exportação completa em JSON com serialização segura de `BigInt` salva em `/data/backups/`.
   - Restauração idempotente (`POST /api/database/restore`) via `upsert` com resolução de dependências em duas passagens para coleções e modelos.
   - Painel integrado em `/metrics` com tabela de backups, download direto, restauração em 1 clique e exclusão com proteção contra directory traversal (`DELETE /api/database/backups/[filename]`).
5. **Varredura Assíncrona em Background (`/api/scan/all`)**:
   - Endpoint assíncrono que retorna `HTTP 202` imediatamente e executa a sincronização de todas as bibliotecas ativas em segundo plano no servidor.
6. **Erradicação de Alertas e Confirmações Nativas (Design System)**:
   - `ToastProvider` e hook `useToast()` com variantes `success`, `error`, `warning`, `info`.
   - `<ConfirmDialog>` padronizado no tema Stitch com variantes `danger`, `warning`, `primary`.
   - Remoção de 100% de `alert()` e `confirm()` nativos da aplicação.
7. **Proteção de Integridade de Coleções (P0)**:
   - Rota `/api/collections/[id]` desvincula modelos e exige `?deleteFiles=true` para remover pastas físicas no disco.

---

## 4. Como Executar e Testar o Projeto

### Rodando com Docker Compose (Recomendado)
```bash
# 1. Iniciar containers
docker compose up -d --build

# 2. Verificar status de saúde
docker compose ps
# 3d-vault-db e 3d-vault-web devem estar (healthy)

# 3. Acessar no navegador
# http://localhost:3000
# Login padrão: admin@printvault.local / admin123
```

---

## 5. Backlog de Próximas Funcionalidades (Para a próxima IA / Futuro)

1. **Integração com Fatiadores e Impressoras 3D**:
   - Conectar os endpoints REST do **Moonraker (Klipper)** e **OctoPrint** aos componentes de telemetria já criados em `/metrics`.
   - Conector **Bambu Lab MQTT** para envio de `.3mf` para impressoras X1C, P1S, A1.
2. **Filtro Avançado de Medidas**:
   - Filtro na galeria por volume máximo de impressão (ex: até 256x256x256mm).
3. **Histórico de Impressões & Consumo de Filamento**:
   - Registrar datas em que o modelo foi impresso, filamento gasto em gramas e custo estimado integrado à fila de bancada.
4. **Restauração de Backup do Banco**:
   - Endpoint e modal para upload e importação de arquivo `.json` de backup para restauração em banco limpo.

