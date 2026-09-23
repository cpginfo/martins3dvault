# Martins3DVault 🖨️✨ (v1.7.2)

<div align="center">

**Sistema Moderno, Dark/Light Mode & Conteinerizado para Organização, Visualização 3D Ultrarrápida e Gerenciamento de Projetos de Impressão 3D (.stl, .3mf, .obj)**
</div>

---

## 📸 Demonstração Visual (Screenshots)

<div align="center">

| 🖩 Calculadora de Preço de Venda 3D | 📑 Gestão de Orçamentos & Vendas |
|:---:|:---:|
| <a href="screenshots/calculadora.png" target="_blank"><img src="screenshots/calculadora.png" width="460" alt="Calculadora de Preço de Venda 3D" /></a> | <a href="screenshots/orcamentos.png" target="_blank"><img src="screenshots/orcamentos.png" width="460" alt="Gestão de Orçamentos & Vendas" /></a> |
| *Simulação analítica de energia, filamento, desgaste, mão de obra e markup dinâmico* | *Controle de pedidos, conversão em vendas reais, importação de planilhas e exportação CSV* |

| 📐 Visualizador 3D Studio & Fatiamento | 🦅 Galeria de Modelos & Controles Eagle |
|:---:|:---:|
| <a href="screenshots/arquivo.png" target="_blank"><img src="screenshots/arquivo.png" width="460" alt="Visualizador 3D Studio & Fatiamento" /></a> | <a href="screenshots/colecao.png" target="_blank"><img src="screenshots/colecao.png" width="460" alt="Galeria de Modelos & Controles Eagle" /></a> |
| *Viewport Three.js com HUD milimétrico, presets de câmera, materiais e drawer técnico* | *Grid ajustável estilo Eagle com zoom dinâmico, badges de polímero e toggle de impressão* |

| 📂 Catálogo de Coleções & Métricas Bento | 📊 Terminal de Oficina & Telemetria |
|:---:|:---:|
| <a href="screenshots/colecoes.png" target="_blank"><img src="screenshots/colecoes.png" width="460" alt="Catálogo de Coleções" /></a> | <a href="screenshots/metricas.png" target="_blank"><img src="screenshots/metricas.png" width="460" alt="Terminal de Oficina & Telemetria" /></a> |
| *Métricas Bento de armazenamento RAID 5 e pastas físicas espelhadas* | *Fila de bancada, telemetria industrial e monitoramento Klipper/Bambu* |

| 📁 Mapeamento de Pastas & Scan Inteligente | 👤 Gestão de Usuários & Permissões |
|:---:|:---:|
| <a href="screenshots/pastas.png" target="_blank"><img src="screenshots/pastas.png" width="460" alt="Mapeamento de Pastas & Scan" /></a> | <a href="screenshots/usuarios.png" target="_blank"><img src="screenshots/usuarios.png" width="460" alt="Gestão de Usuários & Permissões" /></a> |
| *Engine AdditiveCore com status de volumes e espelhamento bidirecional no disco* | *Tabela de operadores RBAC com avatares persistentes e 5 campos de cadastro* |

| 🌐 Upload de Arquivos & Download por Link |
|:---:|
| <a href="screenshots/upload.png" target="_blank"><img src="screenshots/upload.png" width="520" alt="Upload de Arquivos & Download por Link" /></a> |
| *Upload multipart de arquivos 3D e download de pacotes ZIP direto para o cofre* |

</div>

---

## 🌟 Principais Recursos
- 📁 **Mapear Pastas & Scan Inteligente com Espelhamento Total (`/libraries`)**
- ✏️ **Renomeação Física no Disco**:
  - Edição direta de título com persistência física: renomeia o arquivo 3D, a imagem de capa e o manual PDF diretamente na pasta do repositório.
- 🌐 **Upload via Link / Download por URL**:
  - Download via stream direto para a pasta física e vinculação automática com a coleção **`download`**.
  - Descompactação automática de pacotes ZIP com extração de metadados de impressão.
- 👤 **Gestão Completa de Usuários (`/users`)**:
- 🔒 **Login Seguro & Autenticação (`/login`)**:
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
