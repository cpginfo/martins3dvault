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
  - Parâmetros recomendados de fatiamento (altura de camada, tempo estimado, consumo em gramas e metros, e contagem de triângulos da malha).
  - Verificação algorítmica de compatibilidade de volume de mesa (Bambu Lab 256×256×256 mm, Voron 2.4 300×300 mm, etc.).
- **Engine 3D de Alta Velocidade (Three.js + Streaming Binário)**:
  - Conversor de servidor para arquivos `.3mf` complexos (Bambu Studio, OrcaSlicer, Prusa), convertendo em tempo real e cacheando em formato STL Binário consolidado (`threemf-converter.ts` e `/api/assets/mesh`).
  - Trata o problema clássico de travamento em "100%" causado pelo `DOMParser` do Three.js em arquivos 3MF de mais de 200MB de XML.
  - Orientação correta de impressão (conversão Z-Up para Y-Up com rotação `-Math.PI / 2`, apoiado perfeitamente na mesa a `Y = 0`).
  - Predefinições de câmera: **Iso** (Isométrica), **Frente** (Frontal), **Topo** (Superior) e **Reset**.
  - Materiais de impressão: **PLA**, **ABS**, **PETG (Translúcido)** e **Fosco (Matte)**.
  - Paleta com 12 cores populares de filamento 3D.
  - Medições tridimensionais (Bounding Box em mm) e captura de thumbnail com 1 clique.
- **Scanner Inteligente & Regras de Pastas / Coleções**:
  - Varre recursivamente pastas locais ou montagens de rede (NFS/CIFS/SMB).
  - **Coleções**: A pasta de primeiro nível (`dirParts[0]`) define a Coleção no banco. Subpastas pertencem à mesma coleção pai (o modelo de coleções é plano, não cria sub-coleções).
  - **Modelos**: A pasta onde os arquivos 3D estão alocados define o Modelo (`folderPath`).
  - **Sincronização Bidirecional**: Itens removidos do disco são deletados do banco. Renomeações são detectadas por hash/tamanho.
  - **Prioridade Absoluta para Capas Acompanhantes**: Arquivos de imagem (`.jpg`, `.png`, `.webp`) com o mesmo nome base normalizado são automaticamente priorizados como a thumbnail oficial.
- **Opções de Edição do Modelo no Modal e no Studio**:
  - Renomear título inline com persistência imediata (`PUT /api/models/[id]`).
  - Trocar imagem de capa por upload ou por seleção de imagens existentes na pasta (`POST /api/models/[id]/cover`).
  - Enviar e remover manuais de montagem em PDF (`POST` e `DELETE /api/models/[id]/manual`).
- **Terminal de Oficina & Telemetria (`/metrics`)**:
  - Dashboard de bancada preparado para integração Moonraker / Klipper.
  - 4 Cards Bento: Impressões Hoje, Taxa de Sucesso, Consumo de Filamento (kg) e Tempo Ativo.
  - Fila de bancada com status das impressoras e monitoramento de temperatura.
- **Mapear Pastas & Central AdditiveCore (`/libraries`)**:
  - Monitoramento de volume RAID 5, hash monitor e logs em tempo real do crawler.
- **Gestão de Usuários & Controle de Acesso (`/users`)**:
  - Interface dedicada para criar, listar, alterar senhas e excluir usuários com níveis `ADMIN`, `OPERATOR` e `VIEWER`.
- **Sistema de Coleções (`/collections` e `/collections/[id]`)**:
  - Strip de métricas com 4 cards (Coleções, Projetos, Impressos, Volume Total), catálogo temático e vinculação em lote.
- **Upload Manual de Arquivos**:
  - Interface Drag & Drop integrada (`UploadModal.tsx`) e endpoint `POST /api/upload`.
- **Controle de Impressões (Check de Impressos & Filtro de Nunca Impressos)**:
  - Campos `isPrinted` e `printedAt` tanto em `Model` quanto em `ModelFile`.
  - Botão de toggle rápido com 1 clique diretamente no card da galeria (`[ ○ Não impresso ]` ⟷ `[ ✓ Impresso ]`).
  - Abas de filtragem na galeria: **Todos**, **Nunca Impressos** e **Já Impressos**.
- **Health Check & Monitoramento**:
  - Rota `/api/health` conectada ao PostgreSQL e monitorada nativamente pelo Docker Compose.

---

## 2. Stack Tecnológica & Versões Ativas

- **Versão do Aplicativo**: `v1.2.0` (configurada nas variáveis `APP_VERSION` e `NEXT_PUBLIC_APP_VERSION`).
- **Framework**: Next.js 16.3.5 (App Router, Node.js 20+ runtime).
- **UI Library & Styling**: React 19.2.8, Tailwind CSS v4 (`@theme` tokens do Google Stitch), Lucide React & Google Material Symbols Outlined.
- **Motor 3D**: Three.js v0.183+ (`STLLoader.js`, `ThreeMFLoader.js`, `OBJLoader.js`, `OrbitControls.js`).
- **Banco de Dados & ORM**: PostgreSQL 16 com Prisma ORM v6.19 (LTS).
- **Autenticação**: JWT sem estado baseado em cookies seguros via `jose` e `bcryptjs`.
- **Parsing de Arquivos**: `adm-zip` para inspeção e descompactação de 3MF, parser customizado para STL binário/ASCII e montagem de transformações afins.
- **Containerização**: Docker multi-stage com Next.js Standalone, `docker-compose.yml` (`3d-vault-web` e `3d-vault-db`) e rede externa `qg`.
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
