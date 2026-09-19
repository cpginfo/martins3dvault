# Martins3DVault 🖨️✨ (v1.2.0)

<div align="center">

**Sistema Moderno, Dark-Mode & Conteinerizado para Organização, Visualização 3D Ultrarrápida e Gerenciamento de Projetos de Impressão 3D (.stl, .3mf, .obj)**
*Interface reconstruída e alinhada ao Google Stitch Design System ("Martins3D Vault Manager") com controles estilo Eagle App.*

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](#-execução-com-docker-compose)
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

- 📁 **Mapear Pastas & Scan Inteligente (`/libraries`)**:
  - Engine AdditiveCore com monitoramento de armazenamento RAID 5 e integridade SHA-256.
  - Botão de varredura manual com terminal de logs e status em tempo real.

- 👥 **Gestão Completa de Usuários & Permissões (`/users`)**:
  - Tabela RBAC com níveis `ADMIN`, `OPERATOR` e `VIEWER`, status ativo/inativo e redefinição de credenciais.

- 🔒 **Login Seguro & Autenticação (`/login`)**:
  - Tela de login com fundo CAD isométrico, telemetria de hardware e botão de preenchimento rápido para demonstração.

---

## 🚀 Execução com Docker Compose

A forma recomendada de executar o Martins3DVault é via Docker Compose:

### 1. Iniciar os Containers
```bash
docker compose up -d --build
```

O compose iniciará:
1. `3d-vault-db`: Banco de dados PostgreSQL 16 com volume persistente.
2. `3d-vault-web`: Aplicação Next.js compilada em modo standalone na porta 3000 com monitoramento de saúde ativo.

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
| `APP_VERSION` | `v1.2.0` | Versão exibida na interface e no healthcheck |
| `NEXT_PUBLIC_APP_VERSION`| `v1.2.0` | Versão pública no cliente Next.js |
| `PORT` | `3000` | Porta interna do servidor HTTP |
| `DATABASE_URL` | `postgresql://...` | String de conexão com o PostgreSQL |
| `JWT_SECRET` | `change_me_...` | Chave de assinatura dos tokens JWT |
| `ADMIN_EMAIL` | `admin@printvault.local` | E-mail do administrador padrão |
| `ADMIN_PASSWORD` | `admin123` | Senha inicial do administrador |
| `STORAGE_DATA_PATH` | `/data` | Diretório de thumbnails, caches e uploads |
| `STORAGE_LIBRARIES_PATH` | `/libraries` | Ponto de montagem de pastas de arquivos 3D |
