# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

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
