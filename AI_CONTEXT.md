# AI Context & Developer Handover Guide - Martins3DVault

> **INSTRUÇÃO PARA OUTRAS IAs / DESENVOLVEDORES:**
> Se você é um modelo de IA (Claude, GPT, Cursor, Copilot, Gemini, DeepSeek, etc.) ou um engenheiro assumindo este repositório, **leia este arquivo primeiro**. Ele resume todo o contexto técnico, restrições arquiteturais, armadilhas comuns já superadas e os próximos passos planejados.

---

## 1. O que é o Martins3DVault?

O **Martins3DVault** (anteriormente chamado PrintVault) é uma plataforma auto-hospedada (*self-hosted*), conteinerizada via Docker, focada na catalogação, visualização 3D em tempo real de alta performance e gerenciamento de projetos de impressão 3D (`.stl`, `.3mf`, `.obj`, `.step`).

- **Inspiração de Design**: Interfaces modernas, fluidas e escuras estilo **Linear** e **Vercel** (Dark mode nativo, glassmorphism com Tailwind CSS, micro-animações, tag de versão e navegação limpa).
- **Engine 3D de Alta Velocidade (Three.js + Streaming Binário)**:
  - Conversor de servidor para arquivos `.3mf` complexos (Bambu Studio, OrcaSlicer, Prusa), convertendo em tempo real e cacheando em formato STL Binário consolidado (`threemf-converter.ts` e `/api/assets/mesh`).
  - Trata o problema clássico de travamento em "100%" causado pelo `DOMParser` do Three.js em arquivos 3MF de mais de 200MB de XML.
  - Orientação correta de impressão (conversão Z-Up para Y-Up com rotação `-Math.PI / 2`, apoiado perfeitamente na mesa a `Y = 0`).
  - Predefinições de câmera: **Iso** (Isométrica), **Frente** (Frontal), **Topo** (Superior) e **Reset**.
  - Materiais de impressão: **PLA**, **ABS**, **PETG (Translúcido)** e **Fosco (Matte)**.
  - Paleta com 12 cores populares de filamento 3D.
  - Medições tridimensionais (Bounding Box em mm) e captura de thumbnail com 1 clique.
- **Scanner Inteligente & Sincronização em Segundo Plano**:
  - Varre recursivamente pastas locais ou montagens de rede (NFS/CIFS/SMB).
  - **Sincronização Bidirecional**: Itens removidos do disco são deletados do banco. Renomeações são detectadas por hash/tamanho.
  - **Prioridade Absoluta para Capas Acompanhantes**: Arquivos de imagem (`.jpg`, `.png`, `.webp`) com o mesmo nome base (normalizado, ex: `Caneca FLAMENGO..3mf` e `Caneca Flamengo.jpg`) são automaticamente priorizados como a thumbnail oficial.
- **Opções de Edição do Modelo no Modal**:
  - Renomear título inline com persistência imediata (`PUT /api/models/[id]`).
  - Trocar imagem de capa por upload ou por seleção de imagens existentes na pasta (`POST /api/models/[id]/cover`).
  - Enviar e remover manuais de montagem em PDF (`POST` e `DELETE /api/models/[id]/manual`).
- **Gestão de Usuários & Controle de Acesso**:
  - Interface dedicada em `/users` para criar, listar, alterar senhas e excluir usuários com níveis `ADMIN`, `USER` e `VIEWER`.
- **Sistema de Coleções (Collections)**:
  - Criação automática a partir das pastas da biblioteca (`Canecas`, `Cats`, `Desenhos`, `Santos`).
  - Telas `/collections` e `/collections/[id]` para gerenciamento e vinculação de modelos.
- **Upload Manual de Arquivos**:
  - Interface Drag & Drop integrada (`UploadModal.tsx`) e endpoint `POST /api/upload`.
- **Controle de Impressões (Check de Impressos & Filtro de Nunca Impressos)**:
  - Campos `isPrinted` e `printedAt` tanto em `Model` quanto em `ModelFile`.
  - Botão de toggle rápido com 1 clique diretamente no card da galeria (`[ ○ Não impresso ]` ⟷ `[ ✓ Impresso ]`).
  - Abas de filtragem na galeria: **Todos**, **Nunca Impressos** e **Já Impressos**.
  - No modal de detalhes 3D: controle por projeto completo, check individual por peça na aba "Arquivos", e banner com data/hora na aba "Notas de Impressão".
- **Sistema de Pesquisa Inteligente & Ampla**:
  - Campo de pesquisa dedicado diretamente na página (`FilterBar.tsx`) e na barra superior (`Navbar.tsx`), sincronizados entre si e com a URL `?q=...`.
  - Atalho global `⌘K` / `Ctrl+K` para focar imediatamente na busca.
  - Suporte a busca por termos múltiplos separados por espaço (ex: `"santa sentada"`), nomes de arquivos na pasta (`.stl`, `.3mf`), coleções e bibliotecas.
- **Health Check & Monitoramento**:
  - Rota `/api/health` conectada ao PostgreSQL e monitorada nativamente pelo Docker Compose.

---

## 2. Stack Tecnológica & Versões Ativas

- **Versão do Aplicativo**: `v1.2.0` (configurada nas variáveis `APP_VERSION` e `NEXT_PUBLIC_APP_VERSION`).
- **Framework**: Next.js 16.3.5 (App Router, Node.js 20+ runtime).
- **UI Library**: React 19.2.8, Tailwind CSS v4, Lucide React icons.
- **Motor 3D**: Three.js v0.183+ (`STLLoader.js`, `ThreeMFLoader.js`, `OBJLoader.js`, `OrbitControls.js`).
- **Banco de Dados & ORM**: PostgreSQL 16 com Prisma ORM v6.19 (LTS).
- **Autenticação**: JWT sem estado baseado em cookies seguros via `jose` e `bcryptjs`.
- **Parsing de Arquivos**: `adm-zip` para inspeção e descompactação de 3MF, parser customizado para STL binário/ASCII e montagem de transformações afins.
- **Containerização**: Docker multi-stage com Next.js Standalone, `docker-compose.yml` e rede externa `qg`.

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

### G. Status de Impressão e Filtro de Nunca Impressos
- O status `isPrinted` (boolean) e `printedAt` (DateTime) estão modelados em `Model`. No `ModelFile`, `isPrinted` permite rastreamento individual de peças.
- A rota `/api/models` filtra `where.isPrinted = false` quando `?printed=false`, e `where.isPrinted = true` quando `?printed=true`.
- A busca `q` decompõe termos separados por espaço e pesquisa em `name`, `folderPath`, `description`, `collection.name`, `library.name`, `files.some.fileName` e `tags`.

---

## 4. Como Executar e Testar o Projeto

### Rodando com Docker Compose (Recomendado)
```bash
# 1. Iniciar containers
docker compose up -d --build

# 2. Verificar status de saúde
docker compose ps
# printvault-db e printvault-web devem estar (healthy)

# 3. Acessar no navegador
# http://localhost:3000
# Login padrão: admin@printvault.local / admin123
```

---

## 5. Backlog de Próximas Funcionalidades (Para a próxima IA / Amanhã)

1. **Integração com Fatiadores e Impressoras 3D**:
   - Conector com **OctoPrint** e **Moonraker (Klipper)** via REST API para envio direto de G-Code com 1 clique.
   - Conector **Bambu Lab MQTT** para envio de `.3mf` para impressoras X1C, P1S, A1.
2. **Download em Lote (ZIP)**:
   - Rota `/api/models/[id]/download-zip` para empacotar modelos multi-peças.
3. **Filtro Avançado de Medidas**:
   - Filtro na galeria por volume máximo de impressão (ex: até 256x256x256mm).
4. **Histórico de Impressões & Consumo de Filamento**:
   - Registrar datas em que o modelo foi impresso, filamento gasto em gramas e custo estimado.
