# Martins3DVault 🖨️✨ (v1.5.4)

<div align="center">

**Sistema Moderno, Dark-Mode & Conteinerizado para Organização, Visualização 3D Ultrarrápida e Gerenciamento de Projetos de Impressão 3D (.stl, .3mf, .obj)**
*Interface reconstruída e alinhada ao Google Stitch Design System ("Martins3D Vault Manager") com controles estilo Eagle App.*

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](#-execução-com-docker-compose)
[![CI/CD](https://github.com/cpginfo/martins3dvault/actions/workflows/publish.yml/badge.svg)](https://github.com/cpginfo/martins3dvault/actions/workflows/publish.yml)
[![GHCR](https://img.shields.io/badge/GHCR-Image_Ready-2496ED?logo=docker&logoColor=white)](https://github.com/cpginfo/martins3dvault/pkgs/container/martins3dvault)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Engine-049EF4?logo=three.js&logoColor=white)](https://threejs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Google Stitch](https://img.shields.io/badge/Google_Stitch-Design_System-FF6F00?logo=google&logoColor=white)](https://stitch.withgoogle.com)

</div>

---

## 🌟 Principais Recursos

- 🎨 **Design System Google Stitch ("Martins3D Vault Manager")**:
  - Tema escuro de alto contraste com paleta industrial (`#0f141b`), detalhes em laranja (`#f97316`), ciano (`#4cd7f6`) e esmeralda (`#4edea3`).
  - Tipografia de precisão com **Inter**, **JetBrains Mono** e **Material Symbols Outlined**.
  - **Sidebar Retrátil Persistente**: Acesso rápido a Modelos 3D, Coleções, Terminal de Oficina, Pastas & Scan e Usuários, com medidor de armazenamento do NAS em RAID 5 e perfil do operador.
  - **Barra Superior (Navbar)**: Busca global integrada com atalho `⌘K`, filtros rápidos de formato (`.STL`, `.3MF`, `G-Code`), status ao vivo do NAS e gatilho de escaneamento.

- 🦅 **Controles de Estúdio Estilo Eagle App**:
  - **Slider de Zoom de Thumbnails**: Ajuste contínuo do tamanho dos cards de 180px até 400px em tempo real.
  - **Modos de Visualização Comutáveis**: Alternância instantânea entre **Grade Grande** (*Large Grid*), **Grade Compacta** (*Compact Grid*) e **Modo Tabela** (*Table View*).
  - **Filtros Rápidos por Polímero**: Badges interativos de contagem para filamentos **PLA**, **PETG**, **ABS/ASA** e **TPU**.

- 📐 **Visualizador 3D Studio (`/models/[id]`)**:
  - **Interface Completa do Stitch**: Viewport Three.js em tela cheia com HUD de dimensões milimétricas em tempo real (`X`, `Y`, `Z`), pílula de controles de câmera (`Iso`, `Frente`, `Topo`, `Reset`), rotação automática, modo Wireframe/Sólido e bounding box.
  - **Barra Flutuante de Materiais**: Simulação de acabamento para **PLA**, **ABS**, **PETG** e **Fosco** com paleta de 12 cores de filamento e halo iluminado.
  - **Captura "Capa 3D"**: Snapshot em alta resolução do ângulo atual persistido diretamente como thumbnail oficial.
  - **Drawer Técnico Lateral**: Parâmetros recomendados de fatiamento (camada, tempo, filamento em gramas/metros, triângulos da malha), avaliação de compatibilidade de volume para mesas padrão (Bambu Lab 256mm e Voron 300mm), notas de bancada e gerenciamento de manuais PDF.

- ⚡ **Motor 3D de Alta Velocidade (Three.js + Streaming Binário)**:
  - **Zero travamento**: Converte e armazena em cache arquivos `.3mf` pesados em STL Binário consolidado, resolvendo lentidão em arquivos complexos de fatiadores modernos.
  - **Orientação Correta de Impressão**: Malhas posicionadas em pé na mesa (`rotation.x = -Math.PI / 2`, apoiadas em `Y = 0`).
  - **Predefinições de Câmera**: Alternância com 1 clique entre visões **Iso** (Isométrica), **Frente** (Frontal) e **Topo** (Superior).
  - **Materiais de Impressão**: Simulação de acabamento para **PLA**, **ABS**, **PETG Translúcido** e **Fosco (Matte)**.
  - **Paleta de 12 Cores de Filamento**: Preto, Branco, Cinza, Vermelho, Azul, Verde, Amarelo, Laranja, Roxo, Rosa, Dourado e Cobre.
  - **Dimensões em tempo real**: Bounding Box 3D com medidas em milímetros (X, Y, Z).
  - **Snapshot 3D com 1 clique**: Capture qualquer ângulo da câmera diretamente pelo navegador e salve como nova capa.

- 🖨️ **Controle de Impressão (Check de Impressos & Não Impressos)**:
  - **1-Clique no Card**: Alterne instantaneamente entre `[ ○ Não impresso ]` e `[ ✓ Impresso ]` diretamente na galeria principal.
  - **Filtro de "Nunca Impressos"**: Exiba com um toque apenas os projetos que ainda não foram para a mesa de impressão.
  - **Controle por Peça no Modal**: Marque peças individuais como impressas na aba "Arquivos" para projetos compostos.
  - **Histórico & Data**: Registro automático da data e horário de conclusão.

- 📊 **Terminal de Oficina & Fila de Bancada (`/metrics`)**:
  - Painel de telemetria industrial preparado para Moonraker / Klipper.
  - 4 Cards Bento de métricas: Impressões Hoje, Taxa de Sucesso, Consumo de Filamento (kg) e Tempo Ativo.
  - Fila de impressão em bancada com progresso em tempo real e status de bicos/mesa.

- 📁 **Mapear Pastas & Scan Inteligente com Espelhamento Total (`/libraries`)**:
  - Engine AdditiveCore com monitoramento de armazenamento RAID 5 e integridade SHA-256.
  - **Espelhamento Físico & Limpeza Automática (`v1.5.4`)**: Ao deletar pastas físicas do diretório `libraries`, o escaneamento remove automaticamente os modelos órfãos e deleta as coleções correspondentes do banco de dados e da barra lateral/interface.
  - Botão de varredura manual com terminal de logs e status em tempo real.

- 📂 **Gestão Física de Coleções & Movimentação em Lote (`/collections/[id]`)**:
  - **Pastas Físicas no Repositório**: Toda coleção criada ganha uma pasta física correspondente na biblioteca.
  - **Seleção Múltipla de Arquivos**: Checkboxes nos cartões com botão "Selecionar Todos" e barra flutuante de ações.
  - **Movimentação Física Completa**: Ao mover arquivos para outra coleção (existente ou nova), o sistema move fisicamente o arquivo 3D principal, imagens de capa/renders e manuais em PDF.
  - **Prevenção de Sobrescrita**: Resolução automática de conflito de nomes adicionando sufixo numérico incremental (ex: `Modelo (1).3mf`), preservando ambos os arquivos.

- ✏️ **Renomeação Física no Disco**:
  - Edição direta de título com persistência física: renomeia o arquivo 3D, a imagem de capa e o manual PDF diretamente na pasta do repositório.

- 🌐 **Upload via Link / Download por URL**:
  - Aba integrada no modal de upload para colar links HTTP/HTTPS de arquivos 3D (`.stl`, `.3mf`, `.obj`, `.step`) ou pacotes `.zip`.
  - Download via stream direto para a pasta física e vinculação automática com a coleção **`download`**.
  - Descompactação automática de pacotes ZIP com extração de metadados de impressão.

- 👤 **Gestão Completa de Usuários (`/users`)**:
  - **Edição e Criação com 5 Campos**: Controle total sobre **Nome**, **Foto de Perfil (Avatar)**, **Senha**, **E-mail** e **Perfil / Nível de Acesso** (`ADMIN`, `OPERATOR`, `VIEWER`).
  - **Upload e Persistência de Foto**: Envio de fotos locais (PNG, JPG, WebP) com preview imediato, processamento em Base64 e persistência em `/data/thumbnails/`.
  - **Segurança de Senhas & Unicidade**: Redefinição opcional de senha mantendo a existente caso deixada em branco e validação de e-mail exclusivo (409 Conflict).
  - **Integração Visual com Sessão**: O avatar do usuário é incorporado ao token JWT e exibido dinamicamente no menu lateral (`Sidebar`) e na tabela de usuários.

- 🗄️ **Provisionamento Automático no Primeiro Boot (`v1.5.1`)**:
  - **Criação do Usuário, Senha e Banco**: Ao iniciar com volume vazio, o PostgreSQL 16 cria automaticamente o usuário (`POSTGRES_USER`), senha (`POSTGRES_PASSWORD`) e database (`POSTGRES_DB`) definidos no `docker-compose.yml`.
  - **Sincronização Automática de Tabelas**: O container web aguarda o PostgreSQL estar saudável e executa `prisma db push` dinamicamente com base na `DATABASE_URL` do Compose, gerando todas as 9 tabelas, índices e relações no banco correto.
  - **Criação do Administrador Inicial**: O usuário administrador padrão (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) e biblioteca inicial são cadastrados automaticamente.
  - **Fallbacks Seguros**: Variáveis possuem valores padrão `${VAR:-default}` para garantir execução mesmo sem arquivo `.env` pré-configurado.

- 🚀 **Publicação Automática & CI/CD (GitHub Actions)**:
  - Pipeline automatizado em `.github/workflows/publish.yml`.
  - Validação estrita de TypeScript e compilação Next.js antes de qualquer publicação.
  - Build e publicação automática no GitHub Container Registry (`ghcr.io/cpginfo/martins3dvault`).
  - Criação automática de GitHub Releases com notas de versão para tags `v*`.

- 🔒 **Login Seguro & Autenticação (`/login`)**:
  - Tela de login com fundo CAD isométrico, telemetria de hardware e botão de preenchimento rápido para demonstração.
  - Proteção integral de todas as rotas e endpoints de API exigindo perfil `ADMIN`.

---

## 🚀 Execução com Docker Compose

A forma recomendada de executar o Martins3DVault é via Docker Compose:

### 1. Iniciar os Containers
```bash
docker compose up -d --build
```

O compose iniciará:
1. `3d-vault-db`: Banco de dados PostgreSQL 16 com volume persistente e auto-provisionamento de credenciais.
2. `3d-vault-web`: Aplicação Next.js standalone na porta 3000 com sincronização de tabelas e monitoramento de saúde ativo.

### 2. Verificar Status de Saúde
```bash
docker compose ps
# 3d-vault-db:  Up (healthy)
# 3d-vault-web: Up (healthy)
```

### 3. Acessar a Aplicação
Abra o navegador em: **[http://localhost:3000](http://localhost:3000)**

**Credenciais Administrativas Padrão:**
- **E-mail:** `admin@printvault.local`
- **Senha:** `admin123`

---

## 🔧 Variáveis de Ambiente no `docker-compose.yml`

| Variável | Valor Padrão | Descrição |
| :--- | :--- | :--- |
| `PORT` | `3000` | Porta interna do servidor HTTP |
| `POSTGRES_USER` | `printvault` | Usuário do banco de dados PostgreSQL |
| `POSTGRES_PASSWORD` | `vaultpass123` | Senha do usuário do banco de dados |
| `POSTGRES_DB` | `printvault` | Nome da base de dados no PostgreSQL |
| `DATABASE_URL` | `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}?schema=public` | String de conexão dinâmica com o PostgreSQL |
| `JWT_SECRET` | `change_me_...` | Chave de assinatura dos tokens JWT |
| `ADMIN_EMAIL` | `admin@printvault.local` | E-mail do administrador padrão |
| `ADMIN_PASSWORD` | `admin123` | Senha inicial do administrador |
| `STORAGE_DATA_PATH` | `/data` | Diretório de thumbnails, caches e uploads |
| `STORAGE_LIBRARIES_PATH` | `/libraries` | Ponto de montagem de pastas de arquivos 3D |
