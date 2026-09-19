# Martins3DVault 🖨️✨ (v1.2.0)

<div align="center">

**Sistema Moderno, Dark-Mode & Conteinerizado para Organização, Visualização 3D Ultrarrápida e Gerenciamento de Projetos de Impressão 3D (.stl, .3mf, .obj)**

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](#-execução-com-docker-compose)
[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![Three.js](https://img.shields.io/badge/Three.js-3D_Engine-049EF4?logo=three.js&logoColor=white)](https://threejs.org)
[![Prisma](https://img.shields.io/badge/Prisma-6.19-2D3748?logo=prisma&logoColor=white)](https://prisma.io)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)

</div>

---

## 🌟 Principais Recursos

- 🎨 **Visual Linear & Vercel**: Interface fluida, moderna, dark-mode nativa (*dark-first*), com suporte a *glassmorphism*, micro-animações, badge de versão no cabeçalho e responsividade total.
- ⚡ **Motor 3D de Alta Velocidade (Three.js + Streaming Binário)**:
  - **Zero travamento**: Converte e armazena em cache arquivos `.3mf` pesados em STL Binário consolidado, resolvendo o problema de lentidão e congelamento da interface em "100%".
  - **Orientação Correta de Impressão**: Malhas posicionadas em pé na mesa (`rotation.x = -Math.PI / 2`, apoiadas em `Y = 0`).
  - **Predefinições de Câmera**: Alternância com 1 clique entre visões **Iso** (Isométrica), **Frente** (Frontal) e **Topo** (Superior).
  - **Materiais de Impressão**: Opções calibradas para **PLA**, **ABS**, **PETG Translúcido** e **Fosco (Matte)**.
  - **Paleta de 12 Cores de Filamento**: Preto, Branco, Cinza, Vermelho, Azul, Verde, Amarelo, Laranja, Roxo, Rosa, Dourado e Cobre.
  - **Dimensões em tempo real**: Bounding Box 3D com medidas em milímetros (X, Y, Z).
  - **Snapshot 3D com 1 clique**: Capture qualquer ângulo da câmera diretamente pelo navegador e salve como nova capa.
- 🖨️ **Controle de Impressão (Check de Impressos & Não Impressos)**:
  - **1-Clique no Card**: Alterne instantaneamente entre `[ ○ Não impresso ]` e `[ ✓ Impresso ]` diretamente na galeria principal.
  - **Filtro de "Nunca Impressos"**: Exiba com um toque apenas os arquivos e projetos que ainda não saíram da impressora 3D.
  - **Controle por Peça no Modal**: Marque peças individuais como impressas na aba "Arquivos" para projetos compostos de múltiplas peças.
  - **Histórico & Data**: Registro automático da data e horário de impressão exibido na aba "Notas de Impressão".
- 🔍 **Sistema de Pesquisa Inteligente & Ampla**:
  - **Busca na Página**: Campo de pesquisa rápido diretamente na barra de filtros (`FilterBar`) com botão de limpar `✕`.
  - **Atalho Global `⌘K` / `Ctrl+K`**: Foco instantâneo na busca a partir de qualquer tela ou teclado.
  - **Busca Abrangente**: Pesquisa por múltiplos termos (ex: `santa sentada`), extensões (`.stl`, `.3mf`), nomes de arquivos internos e coleções.
- 🖼️ **Prioridade Automática de Imagem de Capa**:
  - Imagens com o mesmo nome do modelo (ex: `Caneca FLAMENGO..3mf` e `Caneca Flamengo.jpg`) são automaticamente atribuídas como capa oficial no escaneamento.
- ✏️ **Opções de Edição do Modelo**:
  - **Renomear**: Botão de edição direta no título do modal de detalhes.
  - **Trocar Capa**: Envie uma nova imagem ou selecione uma foto já existente na pasta.
  - **Manuais em PDF**: Faça upload de manuais de montagem e visualize ou exclua diretamente na aba "Manuais".
- 👥 **Gestão Completa de Usuários & Permissões**:
  - Painel visual em `/users` para criar, alterar senhas e gerenciar acessos (`ADMIN`, `USER`, `VIEWER`).
- 📁 **Sistema e Menu de Coleções (Collections)**:
  - Criação automática de coleções baseadas no nome das pastas da biblioteca (ex: `Canecas`, `Cats`, `Desenhos`, `Santos`).
  - Menu e telas dedicadas (`/collections` e `/collections/[id]`) para criação manual, edição e gerenciamento de modelos vinculados.
  - Filtro interativo por Coleção integrado à galeria principal e seletor rápido no modal 3D.
- ⬆️ **Upload Manual de Arquivos**:
  - Modal com suporte a Drag & Drop para múltiplos arquivos 3D (`.stl`, `.3mf`, `.obj`, `.step`), imagens de capa e manuais PDF.
- 🩺 **Health Check Nativo**:
  - Rota `/api/health` integrada diretamente ao healthcheck do Docker Compose.

---

## 🚀 Execução com Docker Compose

A forma recomendada e mais simples de rodar o Martins3DVault é utilizando Docker Compose:

### 1. Iniciar os Containers
```bash
docker compose up -d --build
```

O compose iniciará:
1. `printvault-db`: Banco de dados PostgreSQL 16 com volume persistente.
2. `printvault-web`: Aplicação Next.js compilada em modo standalone com monitoramento de saúde ativo.

### 2. Verificar Status de Saúde
```bash
docker compose ps
# printvault-db: Up (healthy)
# printvault-web: Up (healthy)
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
| `PORT` | `3000` | Porta interna do servidor |
| `DATABASE_URL` | `postgresql://...` | String de conexão com o PostgreSQL |
| `JWT_SECRET` | `change_me_...` | Chave de assinatura dos tokens JWT |
| `ADMIN_EMAIL` | `admin@printvault.local` | E-mail do administrador padrão |
| `ADMIN_PASSWORD` | `admin123` | Senha inicial do administrador |
| `STORAGE_DATA_PATH` | `/data` | Diretório de thumbnails, caches e uploads |
| `STORAGE_LIBRARIES_PATH` | `/libraries` | Ponto de montagem de pastas de arquivos 3D |
