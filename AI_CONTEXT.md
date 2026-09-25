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

### K. Inicialização Automática de Banco e Tabelas no Docker
O container PostgreSQL (`postgres:16-alpine`) só executa `initdb` com usuário e banco quando o volume `postgres_data` estiver vazio. Se o volume já existir com credenciais antigas, o Postgres não recria o usuário/database.
No container `web`, a diretiva `depends_on: db: condition: service_healthy` garante que a aplicação só sobe após o `pg_isready` responder com sucesso. O script `docker-entrypoint.sh` então extrai os parâmetros dinâmicos de `DATABASE_URL` e executa `prisma db push --skip-generate` seguido da inserção do usuário `ADMIN_EMAIL` com senha `ADMIN_PASSWORD` (criptografada via bcrypt).

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
2. **Download em Lote (ZIP)**:
   - Rota `/api/models/[id]/download-zip` para empacotar modelos multi-peças.
3. **Filtro Avançado de Medidas**:
   - Filtro na galeria por volume máximo de impressão (ex: até 256x256x256mm).
4. **Histórico de Impressões & Consumo de Filamento**:
   - Registrar datas em que o modelo foi impresso, filamento gasto em gramas e custo estimado integrado à fila de bancada.
