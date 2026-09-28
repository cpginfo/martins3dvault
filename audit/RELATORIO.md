# Relatório de Auditoria de Responsividade e Acessibilidade (UX)
**Aplicação**: Martins3DVault — Gerenciador Inteligente de Arquivos 3D (STL, 3MF, STEP, G-Code)  
**Versão Auditada**: v1.13.0  
**Data da Auditoria**: 28 de Setembro de 2026  
**Auditor**: Engenheiro Front-End Sênior Especialista em UX Responsivo & Acessibilidade  
**Status**: Fase 3 Concluída (Auditoria & Diagnóstico) — Aguardando Aprovação para Fase 4  

---

## 1. Resumo Executivo

A auditoria técnica e analítica avaliou a integridade do layout, adaptação a viewports, eventos de toque, formulários, renderização do canvas WebGL/Three.js e critérios de acessibilidade (WCAG 2.1 / 2.2) do **Martins3DVault** em 9 larguras de viewport padrão: **320px, 360px, 390px, 414px, 768px, 1024px, 1280px, 1440px e 1920px**, além de alturas de 800px e 667px, e orientações Retrato e Paisagem (**390x844** e **844x390**).

### Notas Gerais de Responsividade (0 a 10)

| Faixa de Dispositivo | Larguras Testadas | Nota | Veredito Técnico |
| :--- | :--- | :---: | :--- |
| **Mobile** | 320px a 480px (Retrato e Paisagem 844x390) | **2.5 / 10** | **Crítico / Inavegável**: A barra lateral fixa ocupa de 75% a 90% da largura da tela sem gaveta móvel (drawer). Inputs com fonte 12px causam zoom forçado no iOS Safari. Visualizador Studio 3D usa largura fixa de 430px para a barra lateral, quebrando a tela inteira em celulares. |
| **Tablet** | 768px a 1024px | **6.0 / 10** | **Regular com Degradação**: A barra lateral pode ser colapsada para ícones (w-20), mas a barra de navegação aglomera botões e sofre sobreposição. A barra de filtros quebra em múltiplas linhas e o Studio 3D consome 56% da tela útil para ficha técnica. |
| **Desktop** | 1280px a 1920px | **9.0 / 10** | **Excelente**: Design moderno, boa distribuição de bento grids, tipografia legível e contraste adequado. Pequenos ajustes necessários apenas em alvos de toque de botões de ação e modais secundários. |

---

## 2. Matriz de Problemas Identificados

| ID | Tela / Componente | Larguras Afetadas | Severidade | Descrição do Problema | Arquivo e Linhas Prováveis | Impacto UX / Evidência |
| :---: | :--- | :--- | :---: | :--- | :--- | :--- |
| **RESP-01** | **Todas as Telas** (`Sidebar.tsx`, `page.tsx`, etc.) | 320px a 768px | **Crítico** | Sidebar fixa (`w-72` / 288px) sem modo gaveta (drawer móvel). O conteúdo principal recebe `pl-72`, restando apenas 32px de largura visível em 320px e 102px em 390px. | `src/components/layout/Sidebar.tsx` (L288-292)<br>`src/app/page.tsx` (L178-180)<br>`src/app/pricing/page.tsx` (L251) | A aplicação torna-se completamente inavegável em qualquer smartphone. O usuário não consegue ver os cards nem os menus. |
| **RESP-02** | **Navbar Superior** (`Navbar.tsx`) | 320px a 768px | **Crítico** | Navbar usa `fixed left-72` / `left-20`. Em mobile, fica empurrada para fora da tela. Não existe botão hamburger acessível para alternar navegação. Botões de ação rápida colidem horizontalmente. | `src/components/layout/Navbar.tsx` (L91-94, L177-218) | O cabeçalho e campo de busca desaparecem da tela ou ficam esmagados em menos de 80px de largura. |
| **RESP-03** | **Modo Studio 3D** (`models/[id]/page.tsx`) | 320px a 1024px | **Crítico** | O painel lateral direito tem largura fixa de `w-[430px] shrink-0` sem colapso responsivo. Em telas móveis (320px a 414px), 430px é maior que a própria tela. | `src/app/models/[id]/page.tsx` (L661-665) | O Canvas 3D é esmagado a 0px ou empurrado para fora da viewport, gerando overflow horizontal catastrófico. |
| **RESP-04** | **Formulários / Inputs** (Login, Modal de Detalhes, Upload, Usuários, Busca) | 320px a 480px | **Alto** | Campos de entrada `<input>`, `<select>` e `<textarea>` usam `text-xs` (12px) ou `text-[11px]`. | `src/app/login/page.tsx` (L153, L175)<br>`src/components/model/ModelDetailModal.tsx` (L1258, L1268)<br>`src/components/upload/UploadModal.tsx` (L395, L427)<br>`src/app/users/page.tsx` (L510, L523) | **Auto-zoom no iOS Safari / WebKit**: O navegador dá zoom de ~130% automaticamente ao focar qualquer campo com fonte < 16px, quebrando o layout da página. |
| **RESP-05** | **Modal Detalhes do Modelo** (`ModelDetailModal.tsx`) | 320px a 768px, Paisagem (844x390) | **Alto** | Modal usa altura fixa `h-[92vh]` com divisão rígida `h-[45vh]` (Canvas) e `h-[55vh]` (Abas/Ficha). Soma 100vh dentro de 92vh, cortando botões de salvar e gerando dupla barra de rolagem. Em paisagem (390px alt.), os botões se sobrepõem ao 3D. | `src/components/model/ModelDetailModal.tsx` (L550, L560, L605) | Em celulares pequenos ou no modo paisagem, não é possível alcançar o botão "Salvar Notas" ou visualizar o modelo 3D adequadamente. |
| **RESP-06** | **Configuração Viewport Meta** (`layout.tsx`) | 320px a 480px | **Alto** | Falta da declaração do Next.js 16 `export const viewport: Viewport = { ... }` com `interactiveWidget: 'resizes-visual'`. | `src/app/layout.tsx` (L19-30) | Teclados virtuais no Android e iOS sobem e cobrem os campos de formulário sem empurrar a viewport do navegador. |
| **RESP-07** | **Visualizador 3D Canvas** (`ModelViewer3D.tsx`) | 320px a 768px | **Alto** | Controles flutuantes (Iso, Frente, Topo, Rotação, Wireframe, BBox, Tema) + Seletor de materiais e cores colidem na mesma área de tela. OrbitControls consome toques sem rolagem suave da página. | `src/components/viewer3d/ModelViewer3D.tsx` (L800-865, L905-979) | Usuário tenta rolar o modal com o dedo e fica preso girando o modelo 3D sem conseguir descer até o formulário. Paleta de cores (16px) impossível de tocar com precisão. |
| **RESP-08** | **Barra de Filtros do Catálogo** (`FilterBar.tsx`) | 320px a 414px | **Médio** | Grupo de botões de estado de impressão ("Todos", "Nunca Impressos", "Já Impressos") tem ~330px de largura fixa, estourando a viewport de 320px. Slider de zoom ocupa espaço horizontal desnecessário no celular. | `src/components/gallery/FilterBar.tsx` (L45-90) | Rolagem horizontal indesejada no topo do catálogo de modelos 3D. |
| **RESP-09** | **Alvos de Toque (Touch Targets < 44x44px)** | 320px a 768px | **Médio** | Dezenas de botões interativos possuem área de toque entre 16x16px e 28x28px (`p-1`, `p-1.5`, `py-0.5`), violando o critério WCAG 2.5.5 / 2.5.8 (mínimo 44x44px). | `ModelCard.tsx` (ações rápidas: L110-140)<br>`Sidebar.tsx` (collapse tree: L210)<br>`Navbar.tsx` (limpar busca: L115)<br>`ModelViewer3D.tsx` (swatches: L963-977) | Dificuldade severa de toque para usuários em telas sensíveis ao toque (erros frequentes de clique). |
| **RESP-10** | **Modal de Upload de Arquivos** (`UploadModal.tsx`) | 320px a 414px | **Médio** | Barra de progresso possui apenas `h-1.5` sem percentual numérico legível. Abas superiores ("Arquivo do Computador" vs "Download via Link") comprimem texto em 320px. | `src/components/upload/UploadModal.tsx` (L250-277, L491-499) | Usuário em mobile enviando arquivo de 80MB não sabe se o envio travou ou em quantos porcento está. |
| **RESP-11** | **Tabelas de Orçamentos e Métricas** (`BudgetsTab.tsx`, `metrics/page.tsx`) | 320px a 390px | **Médio** | No card de orçamentos, o bloco financeiro (`Custo Total`, `Preço Sugerido`, `Lucro`) usa `gap-6`, estourando larguras abaixo de 360px. | `src/app/pricing/components/BudgetsTab.tsx` (L288-315) | Valores cortados ou números decimais quebrando em duas linhas de forma desarmônica. |
| **RESP-12** | **Tela de Login Centralizada** (`login/page.tsx`) | 320px a 360px | **Baixo** | O card do login utiliza padding `p-8 md:p-10` mais margens externas `p-6`. Em 320px, sobram apenas ~208px úteis, gerando sensação de claustrofobia visual. | `src/app/login/page.tsx` (L44, L79) | Layout visualmente apertado em telas menores que 360px. |
| **RESP-13** | **Ícones Material Symbols (FOUT)** (`layout.tsx`, `globals.css`) | Todas as larguras | **Baixo** | Carregamento via Google Fonts sem classe de proteção de font-display. Durante conexões lentas ou offline local, nomes de ícones como `calculate`, `person`, `view_in_ar` aparecem escritos na tela. | `src/app/layout.tsx` (L35-38)<br>`src/app/globals.css` | Quebra estética temporária durante os primeiros segundos de carregamento. |

---

## 3. Diagnóstico e Proposta de Correção Código a Código

Abaixo estão detalhados os planos de correção para cada componente afetado, no padrão **Mobile-First**, preservando integralmente o layout e comportamento Desktop existente.

---

### Problema 1 & 2: Sidebar com Gaveta Móvel (Drawer) e Navbar Adaptativa
- **Arquivos**: `src/components/layout/Sidebar.tsx`, `src/components/layout/Navbar.tsx` e páginas com wrapper de layout (`page.tsx`, `pricing/page.tsx`, etc.).
- **Diagnóstico**: O Sidebar é posicionado como `fixed left-0 top-0 h-full` com largura fixa de 288px (`w-72`) ou 80px (`w-20`). No mobile, ele nunca é ocultado. A Navbar tem `left-72` fixo e nenhum botão hamburger existe para controlar abertura/fechamento em celulares.
- **Solução**:
  1. No mobile (`< lg`), o Sidebar deve iniciar oculto (`-translate-x-full lg:translate-x-0`), abrindo como gaveta flutuante (drawer) sobreposta com backdrop semitransparente escuro ao toque.
  2. Adicionar botão hamburger acessível (44x44px) na Navbar visível apenas em telas menores que `lg`.
  3. No wrapper do conteúdo principal (`page.tsx`), trocar `pl-72` / `pl-20` para `pl-0 lg:pl-72` (ou `lg:pl-20` quando colapsado), liberando 100% da largura útil em dispositivos móveis.
  4. Reduzir ou agrupar os botões de ação na Navbar ("Escanear", "Upload", Notificações) em dropdown compacto no mobile.

#### Trecho Antes e Depois: `src/components/layout/Sidebar.tsx`
```diff
--- ANTES (Sidebar.tsx L288-292)
-    <aside
-      className={`fixed left-0 top-0 h-full z-40 bg-surface-container-low border-r border-outline-variant/30 flex flex-col justify-between transition-all duration-300 ${
-        isCollapsed ? "w-20" : "w-72"
-      }`}
-    >

+++ DEPOIS (Sidebar.tsx com suporte a Drawer Mobile e Overlay)
+    <>
+      {/* Backdrop Mobile Escuro */}
+      {isMobileOpen && (
+        <div
+          onClick={onCloseMobile}
+          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden transition-opacity duration-300"
+          aria-hidden="true"
+        />
+      )}
+
+      <aside
+        className={`fixed left-0 top-0 h-full z-50 lg:z-40 bg-surface-container-low border-r border-outline-variant/30 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:transition-all ${
+          isCollapsed ? "lg:w-20" : "lg:w-72"
+        } w-72 ${
+          isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full lg:translate-x-0"
+        }`}
+      >
+        {/* Botão de Fechar Mobile no Topo */}
+        <div className="flex items-center justify-between p-4 lg:hidden border-b border-outline-variant/20">
+          <span className="text-sm font-bold text-on-surface">Menu de Navegação</span>
+          <button
+            onClick={onCloseMobile}
+            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high min-w-[44px] min-h-[44px] flex items-center justify-center"
+            aria-label="Fechar menu"
+          >
+            <span className="material-symbols-outlined">close</span>
+          </button>
+        </div>
```

#### Trecho Antes e Depois: `src/components/layout/Navbar.tsx`
```diff
--- ANTES (Navbar.tsx L91-94)
-    <header
-      className={`fixed top-0 right-0 z-30 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-6 transition-all duration-300 ${
-        isSidebarCollapsed ? "left-20" : "left-72"
-      }`}
-    >

+++ DEPOIS (Navbar.tsx com Botão Hamburger e Offset Adaptativo)
+    <header
+      className={`fixed top-0 right-0 z-30 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant/30 flex items-center justify-between px-3 sm:px-6 transition-all duration-300 left-0 ${
+        isSidebarCollapsed ? "lg:left-20" : "lg:left-72"
+      }`}
+    >
+      {/* Botão Hamburger Mobile */}
+      <button
+        type="button"
+        onClick={onOpenMobileSidebar}
+        className="lg:hidden p-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center mr-2"
+        aria-label="Abrir menu de navegação"
+      >
+        <span className="material-symbols-outlined text-[24px]">menu</span>
+      </button>
```

#### Trecho Antes e Depois: `src/app/page.tsx`
```diff
--- ANTES (page.tsx L178-180)
-      <div
-        className={`flex-1 flex flex-col transition-all duration-300 ${
-          isSidebarCollapsed ? "pl-20" : "pl-72"
-        }`}
-      >

+++ DEPOIS (page.tsx com Padding Zero no Mobile)
+      <div
+        className={`flex-1 flex flex-col transition-all duration-300 pl-0 ${
+          isSidebarCollapsed ? "lg:pl-20" : "lg:pl-72"
+        }`}
+      >
```

---

### Problema 3: Visualizador Studio 3D (`models/[id]/page.tsx`)
- **Arquivo**: `src/app/models/[id]/page.tsx`
- **Diagnóstico**: O container principal possui `<aside className="w-[430px] shrink-0">`. Em celulares de 320px a 414px, 430px transborda a tela inteira, destruindo o Canvas WebGL.
- **Solução**:
  1. No mobile e tablet (`< lg`), transformar o layout em abas superiores ou botão de alternância: `[ 3D Studio ]` e `[ Ficha Técnica & Orçamento ]`, ou gaveta retrátil inferior (bottom sheet).
  2. No desktop (`>= lg`), manter exatamente o painel lateral de 430px existente.
  3. No modo Studio Mobile, garantir que o canvas WebGL Three.js ocupe `100%` da largura da tela com controles adaptados.

#### Trecho Antes e Depois: `src/app/models/[id]/page.tsx`
```diff
--- ANTES (models/[id]/page.tsx L612-663)
-      <main className="flex-1 flex overflow-hidden relative" data-purpose="interactive-workspace">
-        <section
-          className="flex-1 relative flex flex-col bg-[#05080c] overflow-hidden border-r border-[#161f2c]"
-          data-purpose="3d-viewport"
-        >
-          ...
-        </section>
-        <aside
-          className="w-[430px] shrink-0 bg-[#0c1117] flex flex-col border-l border-[#1a2433] h-full overflow-y-auto"
-          data-purpose="details-drawer"
-        >

+++ DEPOIS (models/[id]/page.tsx com Alternância Mobile e Drawer)
+      {/* Seletor Mobile de Modo (Canvas vs Ficha Técnica) */}
+      <div className="lg:hidden flex items-center bg-[#090d13] border-b border-[#182230] p-1.5 gap-1 shrink-0 z-20">
+        <button
+          type="button"
+          onClick={() => setMobileViewMode("canvas")}
+          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
+            mobileViewMode === "canvas" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
+          }`}
+        >
+          <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
+          Visualizador 3D
+        </button>
+        <button
+          type="button"
+          onClick={() => setMobileViewMode("details")}
+          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
+            mobileViewMode === "details" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white"
+          }`}
+        >
+          <span className="material-symbols-outlined text-[16px]">description</span>
+          Ficha Técnica & Notas
+        </button>
+      </div>
+
+      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" data-purpose="interactive-workspace">
+        <section
+          className={`flex-1 relative flex-col bg-[#05080c] overflow-hidden border-r border-[#161f2c] ${
+            mobileViewMode === "canvas" ? "flex" : "hidden lg:flex"
+          }`}
+          data-purpose="3d-viewport"
+        >
+          ...
+        </section>
+        <aside
+          className={`w-full lg:w-[430px] shrink-0 bg-[#0c1117] flex-col border-l border-[#1a2433] h-full overflow-y-auto ${
+            mobileViewMode === "details" ? "flex" : "hidden lg:flex"
+          }`}
+          data-purpose="details-drawer"
+        >
```

---

### Problema 4: Correção de Font-Size nos Inputs (Fim do Auto-Zoom no iOS Safari)
- **Arquivos**: `src/app/login/page.tsx`, `src/components/model/ModelDetailModal.tsx`, `src/components/upload/UploadModal.tsx`, `src/app/users/page.tsx`, `src/components/layout/Navbar.tsx`.
- **Diagnóstico**: No ecossistema iOS (iPhone / Safari / Chrome iOS), qualquer campo `<input>`, `<select>` ou `<textarea>` que possua `font-size < 16px` provoca zoom involuntário da página ao ser tocado.
- **Solução**: Aplicar a regra utilitária CSS e Tailwind: `text-base sm:text-xs` (ou `text-base sm:text-sm`). Em telas móveis, o tamanho é de 16px exatos, impedindo o zoom da tela do iOS; a partir de `sm` (telas desktop), volta ao estilo compacto.

#### Exemplo Antes e Depois: `src/app/login/page.tsx`
```diff
--- ANTES (login/page.tsx L153, L175)
-  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container font-mono"

+++ DEPOIS (login/page.tsx com font-size 16px no mobile)
+  className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3.5 py-2.5 text-base sm:text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container font-mono"
```

---

### Problema 5: ModelDetailModal (Ajuste para Viewports Pequenos e Orientação Paisagem)
- **Arquivo**: `src/components/model/ModelDetailModal.tsx`
- **Diagnóstico**: Container usa `h-[92vh] flex flex-col md:flex-row`. No mobile, Canvas tem `h-[45vh]` e painel tem `h-[55vh]`. Em celulares pequenos (320px ou altura 667px) ou paisagem (844x390), a área fica comprimida e o usuário não consegue rolar nem salvar os dados.
- **Solução**:
  1. Usar `h-full md:h-[92dvh] max-h-[100dvh] md:max-h-[92dvh]` com bordas adaptativas (`rounded-none md:rounded-3xl`).
  2. Em telas `< md`, adotar abas ou alternância fluida entre visualização 3D e edição de notas.
  3. No modo paisagem móvel (`@media (max-height: 500px)`), colocar o Canvas em tela cheia com botão flutuante para abrir os dados.

#### Trecho Antes e Depois: `src/components/model/ModelDetailModal.tsx`
```diff
--- ANTES (ModelDetailModal.tsx L549-550)
-    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
-      <div className="w-full max-w-6xl h-[92vh] flex flex-col md:flex-row rounded-3xl bg-surface-container-low border border-white/10 shadow-2xl overflow-hidden relative">

+++ DEPOIS (ModelDetailModal.tsx com 100dvh e Altura Segura)
+    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-4 lg:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
+      <div className="w-full max-w-6xl h-[100dvh] md:h-[92dvh] flex flex-col md:flex-row rounded-none md:rounded-3xl bg-surface-container-low border-0 md:border md:border-white/10 shadow-2xl overflow-hidden relative">
```

---

### Problema 6: Configuração de Viewport Meta no Next.js App Router
- **Arquivo**: `src/app/layout.tsx`
- **Diagnóstico**: No Next.js 15/16, o objeto `viewport` deve ser exportado separadamente de `metadata` via `export const viewport: Viewport`. Falta a instrução `interactiveWidget: 'resizes-visual'`, que garante que o teclado virtual em dispositivos móveis não sobreponha inputs.
- **Solução**:

#### Trecho Antes e Depois: `src/app/layout.tsx`
```diff
--- ANTES (layout.tsx L1-25)
-  export const metadata: Metadata = {
-    title: "Martins3DVault",
-    description: "Gerenciador de arquivos STL e 3MF com renderizador 3D integrado",
-  };

+++ DEPOIS (layout.tsx com export const viewport)
+  import type { Metadata, Viewport } from "next";
+
+  export const viewport: Viewport = {
+    width: "device-width",
+    initialScale: 1,
+    maximumScale: 5,
+    userScalable: true,
+    interactiveWidget: "resizes-visual",
+    themeColor: [
+      { media: "(prefers-color-scheme: dark)", color: "#0b0e14" },
+      { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
+    ],
+  };
+
+  export const metadata: Metadata = {
+    title: "Martins3DVault — Cofre Inteligente de Arquivos 3D",
+    description: "Gerenciador profissional de arquivos STL, 3MF, STEP e G-Code com renderizador 3D Studio e telemetria",
+  };
```

---

### Problema 7: Alvos de Toque Acessíveis (Mínimo 44x44px - WCAG 2.5.5 / 2.5.8)
- **Arquivos**: `ModelCard.tsx`, `Sidebar.tsx`, `FilterBar.tsx`, `ModelViewer3D.tsx`.
- **Diagnóstico**: Botões com padding `p-1` ou `p-1.5` criam caixas delimitadoras de toque de apenas 24px a 28px.
- **Solução**: Garantir que botões de toque utilizem pseudoelementos ou classes de espaçamento mínimo: `min-w-[44px] min-h-[44px] flex items-center justify-center`. Na paleta de 12 cores de filamento do `ModelViewer3D.tsx`, aumentar a área de clique para 36px com alvo estendido de 44px.

---

### Problema 8: Barra de Filtros do Catálogo (`FilterBar.tsx`)
- **Arquivo**: `src/components/gallery/FilterBar.tsx`
- **Diagnóstico**: O grupo de botões de estado de impressão ("Todos", "Nunca Impressos", "Já Impressos") tem ~330px de largura fixa, estourando a viewport de 320px. O slider de zoom da grade ocupa espaço excessivo em telas de smartphones.
- **Solução**:
  1. Permitir que os botões usem `flex-wrap` ou rolagem horizontal suave (`overflow-x-auto no-scrollbar`).
  2. Ocultar o controle deslizante de zoom em telas móveis (`hidden sm:flex`), visto que no celular a grade é naturalmente de 1 ou 2 colunas.

---

## 4. Ordem de Prioridade Recomendada para Implementação (Fase 4)

1. **Sprint 1 — Bloqueadores Críticos de Navegação Mobile**:
   - `RESP-01` & `RESP-02`: Implementação do Drawer Móvel na `Sidebar.tsx`, Botão Hamburger e Offset Adaptativo na `Navbar.tsx` e Casca de Layout das páginas (`page.tsx`, `collections`, `libraries`, `metrics`, `pricing`, `users`).
   - `RESP-03`: Responsividade do Modo Studio 3D (`models/[id]/page.tsx`), substituindo a largura fixa de 430px por visualização adaptativa móvel.

2. **Sprint 2 — Experiência de Formulários e Prevenção de Zoom no iOS**:
   - `RESP-06`: Atualização do `layout.tsx` com `export const viewport` e `interactiveWidget: 'resizes-visual'`.
   - `RESP-04`: Ajuste de tamanho de fonte (`>= 16px` em mobile) em todos os `<input>`, `<select>` e `<textarea>` (Login, Modal de Detalhes, Upload, Gestão de Usuários e Calculadora).

3. **Sprint 3 — Modais, Visualizador 3D e Gestos de Toque**:
   - `RESP-05`: Redimensionamento adaptativo do `ModelDetailModal.tsx` usando `100dvh`, divisão inteligente do Canvas 3D e notas.
   - `RESP-07`: Reorganização das toolbars flutuantes do `ModelViewer3D.tsx` e melhoria do comportamento de toque no Canvas.
   - `RESP-10`: Melhoria da barra de progresso e legibilidade do `UploadModal.tsx`.

4. **Sprint 4 — Acessibilidade, Touch Targets e Refinamento Visual**:
   - `RESP-08` & `RESP-09`: Otimização da `FilterBar.tsx` e ampliação de alvos de toque (< 44px) nos cards e controles.
   - `RESP-11` & `RESP-12`: Ajuste fino das tabelas de métricas e orçamentos e do card de Login.
   - `RESP-13`: Proteção contra FOUT em fontes de ícones Material Symbols.

---

> [!IMPORTANT]
> **Status da Auditoria**:
> A auditoria diagnóstica detalhada de código está concluída. Nenhum código-fonte de produção foi alterado durante esta fase.
> 
> **Aguardando aprovação do usuário para criar a branch `fix/responsividade` e iniciar a aplicação sequencial das correções da Fase 4.**
