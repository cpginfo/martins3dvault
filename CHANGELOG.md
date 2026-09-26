# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.11.2] - 2026-09-25

### Adicionado / Otimização & Segurança
- **Migrações Versionadas com Prisma Migrate & Auto-Baseline (`0_init`)**:
  - Transição de `prisma db push` dinâmico para migrações formais e versionadas via `prisma migrate deploy`.
  - Criação da migração inicial baseline ([`prisma/migrations/0_init/migration.sql`](file:///swarm/stl/prisma/migrations/0_init/migration.sql)).
  - Auto-baseline transparente no [`docker-entrypoint.sh`](file:///swarm/stl/docker-entrypoint.sh): detecta automaticamente bancos pré-existentes sem histórico formal e registra `0_init` via `prisma migrate resolve --applied 0_init`, garantindo zero downtime e sem erro de colisão de tabelas.
- **Otimização do Dockerfile & Hardening de Runtime**:
  - Criação do estágio intermediário isolado `prisma-cli` com resolução dinâmica da versão do Prisma, eliminando execuções de `npm install` durante o estágio `runner`.
  - Fixação da dependência `deepmerge-ts: 8.0.0` no `package.json` para resolução global de CVE-2026-40345.
  - Redução da superfície de ataque com remoção completa de `npm`, `npx` e `corepack` da imagem final em produção.
- **Ciclo de Vida Limpo de Usuários no Entrypoint (`docker-entrypoint.sh`)**:
  - Remoção de verificação e sincronização hardcoded de usuários específicos no boot. Usuários criados via interface gráfica mantêm seu ciclo de vida 100% preservado pelo banco de dados, sem sobrescrita de senha ou perfil na inicialização do container.

---

## [1.11.1] - 2026-09-25

### Corrigido / Resiliência
- **Validação Ativa de Storage no Healthcheck (`/api/health`)**:
  - Implementado módulo de probing profundo (`src/lib/storage/health.ts`) com timeout de segurança (2000ms via `Promise.race`) contra congelamento de thread em caso de queda de NFS (`ESTALE`) ou CIFS/SMB.
  - Validação ativa de escrita e leitura em `STORAGE_DATA_PATH` (cache, thumbnails, uploads).
  - Validação ativa de existência e leitura em `STORAGE_LIBRARIES_PATH` e em todas as bibliotecas ativas cadastradas no banco.
  - Retorno de status `HTTP 503 Unhealthy` caso o banco ou qualquer ponto de montagem de storage esteja inacessível, alertando o Docker Healthcheck imediatamente.
- **Travas de Segurança Antidesastre no Scanner (`src/lib/scanner/crawler.ts`)**:
  - Pre-flight check com timeout de 5 segundos antes de iniciar a varredura da biblioteca.
  - **Trava de Montagem Vazia**: Aborta imediatamente a varredura se a pasta física estiver 100% vazia no disco mas a biblioteca contiver modelos cadastrados no banco de dados, eliminando o risco de exclusão acidental em massa por perda de montagem NAS (NFS/CIFS).
  - **Proteção de Órfãos e Coleções**: Bloqueio de exclusão em massa caso nenhum arquivo seja descoberto no disco e salvaguarda verificando a acessibilidade das bibliotecas antes de remover coleções órfãs.

---

## [1.11.0] - 2026-09-25

### Adicionado
- **Controle de Concorrência de Downloads & Proteção contra Exaustão de Recursos**:
  - Implementado limitador de concorrência robusto (`src/lib/security/concurrency-limiter.ts`) para proteger o servidor contra automações e downloads em massa não autorizados.
  - **Limite por Usuário**: Máximo de 3 downloads/conversões simultâneas por usuário autenticado. O 4º download simultâneo recebe `HTTP 429 Too Many Requests` imediatamente com cabeçalho `Retry-After: 5` e mensagem clara ao cliente.
  - **Limite Global de Processo**: Teto de 15 slots simultâneos globais de streaming pesado no backend.
  - **Lock Single-Flight por Arquivo (`getOrConvertMesh`)**: Requisições paralelas solicitando a conversão de um mesmo arquivo `.3mf` para STL compartilham a mesma Promise, eliminando execuções redundantes e picos de CPU.
  - **Throttling de Banda de Streaming (`src/lib/security/stream-throttler.ts`)**: Suporte a limitação de vazão de transferência configurável via variável de ambiente `DOWNLOAD_THROTTLE_MBPS` (padrão 10 MB/s por stream).
  - **Circuit Breaker Automático**: Usuários que acumularem 10 rejeições 429 em uma janela de 5 minutos entram automaticamente em quarentena temporária de 15 minutos com bloqueio preventivo de novos downloads.
  - **Isolamento de Rotas Leves**: O limitador atua exclusivamente nas rotas pesadas (`/api/assets/file` e `/api/assets/mesh`), mantendo rotas de catálogo, metadados, miniaturas e autenticação com tempo de resposta inalterado.
- **Auditoria Estruturada & Observabilidade em Tempo Real**:
  - Logger estruturado com identificação de `userId`, `fileId`, `durationMs`, `bytesTransferred`, `status` (`COMPLETED`, `ABORTED`, `LIMITED`, `ERROR`).
  - Painel de telemetria de concorrência adicionado à tela de Métricas (`/metrics`), com cards de slots ativos, histórico recente de downloads e rejeições por limite.
  - Integração dos contadores de concorrência no endpoint `/api/health` e `/api/stats`.
- **Limites de Recursos no Docker Compose**:
  - Configuração de limites de hardware em `docker-compose.yaml` (`cpus: '2.0'`, `memory: 2G`, reservas `0.5` CPU / `512M` RAM).

---

## [1.10.1] - 2026-09-25

### Corrigido
- **Verificação Imediata de Versões do GitHub**:
  - Remoção de regras de cache interno do Next.js Data Cache (`cache: "no-store"`), assegurando consulta em tempo real à API do GitHub sem retenção de respostas obsoletas.
  - Implementação de cabeçalhos anti-cache e parâmetros de invalidação imediata (`_t=...`) no cliente e no servidor.
  - Consulta combinada entre `/releases/latest` e `/tags`, garantindo a detecção instantânea de novas versões recém-publicadas.

---

## [1.10.0] - 2026-09-25

### Adicionado
- **Sistema de Notificação Automática de Versões (GitHub Releases)**:
  - Verificação periódica automática e manual de novas versões disponíveis no GitHub via `UpdateProvider` e `UpdateContext`.
  - **Menu de Notificações na Navbar**: sino interativo com animação de pulso (*ping* laranja) quando há nova versão disponível, central de notificações com status do sistema e botão para forçar checagem.
  - **Card Flutuante (Toast)**: alerta elegante no canto inferior direito com suporte a dispensar e salvar preferência no `localStorage`.
  - **Badge na Sidebar**: indicador de nova versão disponível (`UP`) no rodapé ao lado da versão atual instalada.
  - **Modal Completo de Atualização**: comparativo de versões, visualizador de changelog e comando de atualização Docker copiado com 1 clique (`docker compose pull && docker compose up -d`).

---

## [1.9.1] - 2026-09-25

### Corrigido
- **Autenticação e Controle de Acesso RBAC (Proxy & Sessão)**:
  - Corrigido loop de redirecionamento no Next.js Proxy (`src/proxy.ts`) que impedia usuários autenticados com perfil não-administrador (Operador e Visualizador) de acessar a plataforma.
  - Desbloqueadas as rotas de API do sistema (`/api/models`, `/api/collections`, `/api/assets/mesh`, `/api/assets/file`, `/api/assets/thumbnails`, `/api/upload`), permitindo visualização de malhas 3D no Three.js, listagem de modelos e downloads.
  - Implementada restrição estrita garantindo que **somente administradores** (`ADMIN`) tenham permissão para acessar a interface de usuários (`/users`) e executar ações em `/api/users/*`.
- **Padronização de Papéis e Interface Dinâmica**:
  - Unificação do tipo `UserRole` (`ADMIN`, `OPERATOR`, `USER`, `EDITOR`, `VIEWER`) em `src/lib/auth/session.ts` com validação hierárquica `requireOperator()`.
  - Ajuste na tela de usuários (`/users`) com seleção padrão `OPERATOR`, badges corretos e filtros de contagem condizentes.
  - Atualização do `Sidebar.tsx` para ocultar itens administrativos ("Gestão de Usuários" e "Mapear Pastas & Scan") para perfis de Operador e Visitante.
- **Provisionamento e Migração no Boot (`docker-entrypoint.sh`)**:
  - Migração transparente de papéis legados para `OPERATOR` e verificação ativa do usuário de oficina no boot.

---

## [1.9.0] - 2026-09-23

### Adicionado
- **Coleções Hierárquicas (Árvore de Pastas Aninhada)**:
  - Auto-relacionamento na model `Collection` (`parentId`, `parent`, `children`, `folderPath`) com integridade referencial em cascata e índices dedicados.
  - Varredura recursiva multi-nível sem achatamento no scanner inteligente: reflete a estrutura física de subpastas do disco em qualquer profundidade e vincula modelos exclusivamente à coleção folha mais específica.
  - Sincronização física bidirecional de diretórios: movimentação de modelos entre coleções aninhadas move fisicamente os arquivos no disco; criação de subcoleções gera subpastas; renomeação física com atualização em cascata de caminhos (`folderPath`, `relativePath`) de coleções filhas e modelos.
  - Endpoint de árvore `GET /api/collections?tree=true` com contadores agregados recursivos.
  - Endpoint de detalhes com trilha completa de breadcrumbs (`breadcrumbs`) e subpastas imediatas (`children`).
  - Navegação visual completa no frontend: árvore interativa no Sidebar com chevrons de expandir/recolher e recuo por nível; alternador Grade vs Árvore (Tree Explorer) na tela de Coleções; trilha de navegação breadcrumb e prateleira de cards de subcoleções na página da coleção; seletor de Coleção Pai no modal de criação.
  - Script de migração (`migrate-hierarchy.ts`) para reorganizar coleções pré-existentes no banco sem perda de dados.
- **Gerenciamento e Limpeza de Cache de Renderização 3D (`/data/cache`)**:
  - Painel dedicado na tela de **Métricas dos Arquivos** (`/metrics`) exibindo tamanho total em disco e contagem de malhas STL binárias cacheadas para o Three.js.
  - Ação de limpeza com confirmação em duas etapas, indicador de progresso e relatório em tempo real do espaço liberado em MB/GB.
  - Endpoints de API seguros `GET /api/cache` e `DELETE /api/cache`, integrados ao retorno de `GET /api/stats`.

### Modificado
- **Docker & Segurança em Runtime**:
  - `docker-entrypoint.sh`: suporte à variável `ADMIN_FORCE_RESET` para evitar sobrescrever alterações de senha do administrador realizadas na interface a cada boot.
  - `Dockerfile`: instalação do Prisma CLI isolada via overrides forçando `deepmerge-ts` 8.0.0 (correção de CVE) e execução sob usuário não-root `nextjs`.
  - Permissões na pasta `data/cache` ajustadas para gravação e exclusão pelo usuário não-root.

---

## [1.8.0] - 2026-09-23

### Adicionado
- **Extração Real de Metadados de Fatiamento (.3mf)**:
  - Extrator nativo que analisa arquivos `.3mf` (arquivos ZIP estruturados) lendo `Metadata/project_settings.config`, `Metadata/model_settings.config` e `Metadata/plate_*.json`.
  - Extração automática de altura de camada (`layer_height`), tipo de filamento (`filament_type`), diâmetro de bico (`nozzle_diameter`), densidade de preenchimento (`sparse_infill_density`) e contagem total de triângulos/faces (`face_count`).
  - Persistência no banco de dados tanto durante o escaneamento (`crawler`) quanto sob demanda.
- **Painel de Parâmetros Técnicos no Modal de Detalhes (`ModelDetailModal`)**:
  - Exibição de cards de fatiamento no modal rápido da galeria: Altura de Camada, Tempo Estimado, Consumo Estimado de Filamento (g e m) e Triângulos/Malha.
  - Avaliação em tempo real de Compatibilidade de Volume & Mesa com badges dinâmicos (`100% Compatível`, `Mesa Grande Requerida`, `Excede Mesas`) e chips para Bambu Lab X1C (256mm), Voron 2.4 (300mm) e Creality K1 Max.
  - Especificações de material: Filamento recomendado, Preenchimento e Diâmetro do Bico.
- **Cálculo Dinâmico Geométrico & Bounding Box (Three.js)**:
  - Conexão bidirecional entre o `ModelViewer3D` e o painel de detalhes: ao carregar o modelo 3D, a bounding box e a malha são computadas no Three.js e salvas no banco de dados automaticamente caso o arquivo ainda não as possuísse.
- **Caminho Completo do Arquivo sem Quebras**:
  - Container monoespaçado com quebra dinâmica de palavras (`break-words [overflow-wrap:anywhere] select-all`) e botão de cópia rápida no Studio 3D e no Modal de Detalhes.
- **Campo de Tempo Estimado nas Notas de Impressão**:
  - Adicionado campo dedicado para tempo estimado em minutos na aba de Notas Técnicas.

---

## [1.7.2] - 2026-09-23

### Adicionado
- **Download Resiliente de Arquivos 3D e Manuais PDF**:
  - Stream chunked direto com cabeçalhos `Content-Disposition`, `Content-Length` e fallback de codificação.
- **Pipeline CI/CD com Cosign e Trivy**:
  - Assinatura digital de imagens no GHCR com Cosign e verificação de vulnerabilidades no GitHub Actions.

---

## [1.7.0] - 2026-09-22

### Adicionado
- **Visualizador 3D Studio em Tela Cheia**:
  - Viewport imersivo Three.js com suporte a STL, 3MF e OBJ, presets de câmera e snapshot de capas.
- **Calculadora de Custos & Vendas**:
  - Módulo completo de precificação de impressão 3D, simulação de energia, desgaste de bico e markup.
