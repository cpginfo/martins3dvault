"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import Link from "next/link";
import {
  FolderMinus,
  FolderInput,
  FolderPlus,
  Check,
  X,
  Pencil,
  Loader2,
  AlertCircle,
  FolderTree,
  ArrowRight,
} from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import FilterBar, { ViewMode } from "@/components/gallery/FilterBar";
import PaginationBar from "@/components/gallery/PaginationBar";
import ModelCard, { ModelCardData } from "@/components/gallery/ModelCard";
import ModelDetailModal, { ModelDetailData } from "@/components/model/ModelDetailModal";

interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  parentId?: string | null;
  folderPath?: string | null;
  breadcrumbs?: Array<{ id: string; name: string; slug: string }>;
  parent?: { id: string; name: string; slug: string; parentId: string | null; folderPath: string | null } | null;
  children?: Array<{
    id: string;
    name: string;
    slug: string;
    folderPath: string | null;
    coverImage: string | null;
    _count: { models: number; children: number };
  }>;
  models: ModelCardData[];
}

export default function CollectionDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collection, setCollection] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedModel, setSelectedModel] = useState<ModelDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Estados de Filtro, Visualização e Paginação (como no Dashboard)
  const [searchQuery, setSearchQuery] = useState("");
  const [printedFilter, setPrintedFilter] = useState<"all" | "unprinted" | "printed">("all");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedPolymer, setSelectedPolymer] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState("date_desc");
  const [zoomSize, setZoomSize] = useState(280);
  const [viewMode, setViewMode] = useState<ViewMode>("large");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(48);
  const [isScanningFolder, setIsScanningFolder] = useState(false);

  // Seleção múltipla para mover arquivos
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([]);

  // Modal para mover modelos selecionados
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [allCollections, setAllCollections] = useState<Array<{ id: string; name: string; folderPath?: string | null }>>([]);
  const [targetCollectionId, setTargetCollectionId] = useState("");
  const [isCreatingNewCol, setIsCreatingNewCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [movingModels, setMovingModels] = useState(false);
  const [moveError, setMoveError] = useState("");

  // Modal para renomear modelo e arquivos físicos
  const [modelToRename, setModelToRename] = useState<{ id: string; name: string } | null>(null);
  const [renameNewName, setRenameNewName] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState("");

  // Modal para adicionar modelos existentes à coleção
  const [isAddModelsOpen, setIsAddModelsOpen] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelCardData[]>([]);
  const [selectedToAdd, setSelectedToAdd] = useState<string[]>([]);
  const [searchModelQuery, setSearchModelQuery] = useState("");
  const [addingModels, setAddingModels] = useState(false);

  const fetchCollection = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collections/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCollection(data);
      }
    } catch (err) {
      console.error("Erro ao buscar detalhes da coleção:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollection();
    setSelectedModelIds([]);
  }, [id]);

  // Carrega todas as coleções para a opção de movimentação
  const fetchAllCollections = async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setAllCollections(data.filter((c: any) => c.id !== id));
      }
    } catch (err) {
      console.error("Erro ao buscar lista de coleções:", err);
    }
  };

  // Seleção múltipla
  const handleToggleSelectModel = (modelId: string) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((i) => i !== modelId) : [...prev, modelId]
    );
  };

  const handleSelectAll = () => {
    if (!collection?.models) return;
    if (selectedModelIds.length === collection.models.length) {
      setSelectedModelIds([]);
    } else {
      setSelectedModelIds(collection.models.map((m) => m.id));
    }
  };

  // Abrir Modal de Mover
  const handleOpenMoveModal = async () => {
    if (selectedModelIds.length === 0) return;
    setMoveError("");
    setIsCreatingNewCol(false);
    setNewColName("");
    setNewColDesc("");
    setTargetCollectionId("");
    await fetchAllCollections();
    setIsMoveModalOpen(true);
  };

  // Executar Movimentação
  const handleConfirmMove = async () => {
    if (isCreatingNewCol && !newColName.trim()) {
      setMoveError("Informe o nome da nova coleção.");
      return;
    }

    if (!isCreatingNewCol && !targetCollectionId) {
      setMoveError("Selecione a coleção de destino.");
      return;
    }

    setMovingModels(true);
    setMoveError("");

    try {
      const payload: any = {
        modelIds: selectedModelIds,
      };

      if (isCreatingNewCol) {
        payload.newCollectionName = newColName.trim();
        if (newColDesc.trim()) payload.newCollectionDesc = newColDesc.trim();
      } else {
        payload.targetCollectionId = targetCollectionId;
      }

      const res = await fetch("/api/models/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao mover arquivos.");
      }

      setIsMoveModalOpen(false);
      setSelectedModelIds([]);
      await fetchCollection();
    } catch (err: any) {
      setMoveError(err.message || "Erro durante a movimentação.");
    } finally {
      setMovingModels(false);
    }
  };

  // Abrir Modal de Renomeação Rápida
  const handleOpenQuickRename = (model: ModelCardData, e: React.MouseEvent) => {
    e.stopPropagation();
    setModelToRename({ id: model.id, name: model.name });
    setRenameNewName(model.name);
    setRenameError("");
  };

  // Executar Renomeação
  const handleConfirmRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelToRename || !renameNewName.trim()) return;

    if (renameNewName.trim() === modelToRename.name) {
      setModelToRename(null);
      return;
    }

    setRenaming(true);
    setRenameError("");

    try {
      const res = await fetch(`/api/models/${modelToRename.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: renameNewName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha ao renomear arquivo.");
      }

      setModelToRename(null);
      await fetchCollection();
    } catch (err: any) {
      setRenameError(err.message || "Erro ao renomear.");
    } finally {
      setRenaming(false);
    }
  };

  // Modal Vincular Modelos Existentes
  const handleOpenAddModels = async () => {
    setIsAddModelsOpen(true);
    setSelectedToAdd([]);
    try {
      const res = await fetch("/api/models?limit=all");
      if (res.ok) {
        const data = await res.json();
        const existingIds = new Set((collection?.models || []).map((m) => m.id));
        setAvailableModels((data.items || []).filter((m: ModelCardData) => !existingIds.has(m.id)));
      }
    } catch (err) {
      console.error("Erro ao buscar modelos disponíveis:", err);
    }
  };

  const handleToggleAddCandidate = (modelId: string) => {
    setSelectedToAdd((prev) =>
      prev.includes(modelId) ? prev.filter((i) => i !== modelId) : [...prev, modelId]
    );
  };

  const handleConfirmAddModels = async () => {
    if (selectedToAdd.length === 0) return;
    setAddingModels(true);
    try {
      const res = await fetch(`/api/collections/${id}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelIds: selectedToAdd }),
      });
      if (res.ok) {
        setIsAddModelsOpen(false);
        fetchCollection();
      }
    } catch (err) {
      console.error("Erro ao adicionar modelos:", err);
    } finally {
      setAddingModels(false);
    }
  };

  const handleRemoveFromCollection = async (modelId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/collections/${id}/models?modelId=${modelId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCollection();
      }
    } catch (err) {
      console.error("Erro ao remover da coleção:", err);
    }
  };

  const handleOpenModel = async (modelId: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/models/${modelId}`);
      if (res.ok) {
        const detail = await res.json();
        setSelectedModel(detail);
      }
    } catch (err) {
      console.error("Erro ao abrir detalhes:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleScanCollectionFolder = async () => {
    setIsScanningFolder(true);
    try {
      const res = await fetch(`/api/collections/${id}/scan`, { method: "POST" });
      if (res.ok) {
        await fetchCollection();
      }
    } catch (err) {
      console.error("Erro ao escanear pasta da coleção:", err);
    } finally {
      setTimeout(() => setIsScanningFolder(false), 1000);
    }
  };

  // Handlers para FilterBar
  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };
  const handlePrintedFilterChange = (p: "all" | "unprinted" | "printed") => {
    setPrintedFilter(p);
    setCurrentPage(1);
  };
  const handleFormatSelect = (f: string) => {
    setSelectedFormat(f);
    setCurrentPage(1);
  };
  const handleToggleFavorites = () => {
    setFavoritesOnly((prev) => !prev);
    setCurrentPage(1);
  };
  const handlePolymerSelect = (poly: string) => {
    setSelectedPolymer(poly);
    setCurrentPage(1);
  };
  const handleSortChange = (s: string) => {
    setSort(s);
    setCurrentPage(1);
  };
  const handlePageSizeChange = (size: number | "all") => {
    setPageSize(size);
    setCurrentPage(1);
  };
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Filtragem e ordenação dos modelos da coleção
  const filteredModels = useMemo(() => {
    if (!collection?.models) return [];
    let list = [...collection.models];

    // Busca textual
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.folderPath.toLowerCase().includes(q) ||
          m.description?.toLowerCase().includes(q) ||
          m.files.some((f) => f.fileName.toLowerCase().includes(q)) ||
          m.tags?.some((t) => t.name.toLowerCase().includes(q))
      );
    }

    // Status de impressão
    if (printedFilter === "printed") {
      list = list.filter((m) => m.isPrinted);
    } else if (printedFilter === "unprinted") {
      list = list.filter((m) => !m.isPrinted);
    }

    // Extensão / Formato
    if (selectedFormat) {
      list = list.filter((m) =>
        m.files.some((f) => f.format.toUpperCase() === selectedFormat.toUpperCase())
      );
    }

    // Favoritos
    if (favoritesOnly) {
      list = list.filter((m) => m.isFavorite);
    }

    // Polímero
    if (selectedPolymer) {
      const poly = selectedPolymer.toLowerCase();
      list = list.filter(
        (m) =>
          m.files.some((f) => f.fileName.toLowerCase().includes(poly)) ||
          (m.filamentType && m.filamentType.toLowerCase().includes(poly))
      );
    }

    // Ordenação
    if (sort === "name_asc") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "name_desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === "date_asc") {
      list.sort(
        (a, b) =>
          (a.createdAt ? new Date(a.createdAt).getTime() : 0) -
          (b.createdAt ? new Date(b.createdAt).getTime() : 0)
      );
    } else if (sort === "date_desc") {
      list.sort(
        (a, b) =>
          (b.createdAt ? new Date(b.createdAt).getTime() : 0) -
          (a.createdAt ? new Date(a.createdAt).getTime() : 0)
      );
    } else if (sort === "files_desc") {
      list.sort((a, b) => (b.files?.length || 0) - (a.files?.length || 0));
    }

    return list;
  }, [
    collection?.models,
    searchQuery,
    printedFilter,
    selectedFormat,
    favoritesOnly,
    selectedPolymer,
    sort,
  ]);

  const totalFilteredCount = filteredModels.length;
  const totalPages =
    pageSize === "all" ? 1 : Math.max(1, Math.ceil(totalFilteredCount / pageSize));
  const paginatedModels = useMemo(() => {
    if (pageSize === "all") return filteredModels;
    const start = (currentPage - 1) * pageSize;
    return filteredModels.slice(start, start + pageSize);
  }, [filteredModels, currentPage, pageSize]);

  const filteredAvailable = searchModelQuery
    ? availableModels.filter((m) =>
        m.name.toLowerCase().includes(searchModelQuery.toLowerCase())
      )
    : availableModels;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "pl-20" : "pl-72"
        }`}
      >
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          selectedFormat={selectedFormat}
          onFormatChange={handleFormatSelect}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-24">
          <div className="flex flex-col w-full gap-5 pt-5">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant font-medium flex-wrap">
                <Link
                  href="/collections"
                  className="flex items-center gap-1 hover:text-primary transition-colors text-outline hover:text-white"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_copy</span>
                  <span>Coleções</span>
                </Link>
                {collection?.breadcrumbs?.map((crumb) => (
                  <React.Fragment key={crumb.id}>
                    <span className="text-outline/60">/</span>
                    <Link
                      href={`/collections/${crumb.id}`}
                      className="hover:text-primary transition-colors hover:underline truncate max-w-[140px]"
                      title={crumb.name}
                    >
                      {crumb.name}
                    </Link>
                  </React.Fragment>
                ))}
                <span className="text-outline/60">/</span>
                <span className="text-on-surface font-semibold truncate max-w-xs bg-surface-container px-2 py-0.5 rounded text-primary">
                  {collection?.name || "Carregando..."}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleScanCollectionFolder}
                  disabled={isScanningFolder}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs font-semibold transition-all border border-secondary/20 hover:border-secondary/50 disabled:opacity-50"
                  title="Escanear incrementalmente apenas a pasta física desta coleção no disco"
                >
                  <span className={`material-symbols-outlined text-[16px] ${isScanningFolder ? "animate-spin" : ""}`}>
                    sync
                  </span>
                  <span>{isScanningFolder ? "Escaneando..." : "Escanear Pasta"}</span>
                </button>

                {collection?.models && collection.models.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-medium transition-all border border-white/5"
                  >
                    <span>
                      {selectedModelIds.length === collection.models.length
                        ? "Desmarcar Todos"
                        : "Selecionar Todos"}
                    </span>
                  </button>
                )}
                <button
                  onClick={handleOpenAddModels}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Vincular Modelos</span>
                </button>
              </div>
            </div>

            {/* Collection Header Banner */}
            <div className="p-5 rounded-xl bg-surface-container-low border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-surface-container-highest text-secondary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[32px]">folder</span>
                </div>
                <div className="flex flex-col gap-1">
                  <h1 className="text-xl font-bold text-on-surface tracking-tight">
                    {collection?.name}
                  </h1>
                  <p className="text-xs text-on-surface-variant max-w-xl">
                    {collection?.description || "Coleção sem descrição definida."}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary text-[11px] font-mono">
                      {collection?.models.length || 0} arquivos vinculados
                    </span>
                    {filteredModels.length !== (collection?.models?.length || 0) && (
                      <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant text-[11px] font-mono border border-white/5">
                        {filteredModels.length} filtrados
                      </span>
                    )}
                    {selectedModelIds.length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary text-[11px] font-mono border border-primary-container/30">
                        {selectedModelIds.length} selecionados
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seção de Subcoleções (Pastas Filhas) */}
            {collection?.children && collection.children.length > 0 && (
              <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-on-surface uppercase tracking-wider font-mono">
                    <span className="material-symbols-outlined text-[16px] text-secondary">folder_copy</span>
                    <span>Subcoleções ({collection.children.length})</span>
                  </div>
                  <span className="text-[11px] text-outline font-mono">Pastas aninhadas</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {collection.children.map((child) => (
                    <Link
                      key={child.id}
                      href={`/collections/${child.id}`}
                      className="group flex flex-col p-3 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/5 hover:border-secondary/40 transition-all shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="p-1.5 rounded-lg bg-surface-container-highest text-secondary group-hover:text-primary transition-colors">
                          <span className="material-symbols-outlined text-[18px]">folder</span>
                        </div>
                        <span className="material-symbols-outlined text-[14px] text-outline group-hover:text-primary transition-colors">
                          arrow_forward
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                        {child.name}
                      </span>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-on-surface-variant">
                        <span>{child._count.models} modelos</span>
                        {child._count.children > 0 && (
                          <>
                            <span>•</span>
                            <span>{child._count.children} pastas</span>
                          </>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Eagle-style Studio Control & Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={handleSearchChange}
              printedFilter={printedFilter}
              onPrintedFilterChange={handlePrintedFilterChange}
              selectedFormat={selectedFormat}
              onFormatSelect={handleFormatSelect}
              favoritesOnly={favoritesOnly}
              onToggleFavorites={handleToggleFavorites}
              sort={sort}
              onSortChange={handleSortChange}
              totalCount={collection?.models?.length || 0}
              zoomSize={zoomSize}
              onZoomChange={setZoomSize}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedPolymer={selectedPolymer}
              onPolymerSelect={handlePolymerSelect}
            />

            {/* Models Gallery (Grid ou Tabela) */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
                  sync
                </span>
                <span className="text-xs font-mono">Carregando modelos da coleção...</span>
              </div>
            ) : !collection?.models || collection.models.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-surface-container-low border border-white/5 text-center gap-3">
                <div className="p-4 rounded-full bg-surface-container-highest text-primary-container">
                  <span className="material-symbols-outlined text-[36px]">view_in_ar</span>
                </div>
                <h3 className="font-semibold text-base text-on-surface">Nenhum modelo nesta coleção</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Adicione modelos já catalogados nesta coleção para facilitar o acesso.
                </p>
                <button
                  onClick={handleOpenAddModels}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Vincular Modelos Agora</span>
                </button>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-surface-container-low border border-white/5 text-center gap-3">
                <div className="p-4 rounded-full bg-surface-container-highest text-primary-container">
                  <span className="material-symbols-outlined text-[36px]">filter_alt_off</span>
                </div>
                <h3 className="font-semibold text-base text-on-surface">Nenhum modelo encontrado com os filtros</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Tente limpar ou ajustar os filtros de formato, status de impressão ou termo de busca.
                </p>
              </div>
            ) : viewMode === "table" ? (
              <div className="w-full overflow-x-auto rounded-xl bg-surface-container-low border border-white/5 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-outline bg-surface-container-lowest">
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            paginatedModels.length > 0 &&
                            paginatedModels.every((m) => selectedModelIds.includes(m.id))
                          }
                          onChange={handleSelectAll}
                          className="accent-primary rounded cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-3">Modelo / Biblioteca</th>
                      <th className="py-3 px-3">Extensão</th>
                      <th className="py-3 px-3">Dimensões (XYZ)</th>
                      <th className="py-3 px-3">Arquivos</th>
                      <th className="py-3 px-3">Status de Impressão</th>
                      <th className="py-3 px-3 text-right">Favorito</th>
                      <th className="py-3 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedModels.map((model) => {
                      const isSelected = selectedModelIds.includes(model.id);
                      return (
                        <tr
                          key={model.id}
                          onClick={() => handleOpenModel(model.id)}
                          className={`border-b border-white/5 hover:bg-surface-container-high transition-colors cursor-pointer group ${
                            isSelected ? "bg-primary-container/10" : ""
                          }`}
                        >
                          <td
                            className="py-3 px-3 text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectModel(model.id);
                            }}
                          >
                            <button
                              type="button"
                              className={`w-5 h-5 rounded flex items-center justify-center border transition-all ${
                                isSelected
                                  ? "bg-primary-container border-primary-container text-on-primary"
                                  : "border-white/20 bg-surface-container-lowest group-hover:border-white/40"
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded bg-surface-container-high overflow-hidden flex-shrink-0">
                                {model.coverImage ? (
                                  <img src={model.coverImage} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-outline">
                                    <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                                  {model.name}
                                </span>
                                <span className="text-[10px] text-on-surface-variant font-mono">
                                  {model.library?.name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="text-xs font-mono text-secondary">
                              {model.files?.[0]?.format || "STL"}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-xs font-mono text-on-surface-variant">
                            {model.files?.[0]?.dimensionsX &&
                            model.files?.[0]?.dimensionsY &&
                            model.files?.[0]?.dimensionsZ
                              ? `${Math.round(model.files[0].dimensionsX)}×${Math.round(
                                  model.files[0].dimensionsY
                                )}×${Math.round(model.files[0].dimensionsZ)}mm`
                              : "—"}
                          </td>
                          <td className="py-3 px-3 text-xs font-mono text-on-surface-variant">
                            {model._count?.files || model.files?.length || 1}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                model.isPrinted
                                  ? "bg-tertiary/20 text-tertiary border border-tertiary/30"
                                  : "bg-surface-container-highest text-on-surface-variant"
                              }`}
                            >
                              {model.isPrinted ? "Já Impresso" : "Nunca Impresso"}
                            </span>
                          </td>
                          <td
                            className="py-3 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={async () => {
                                const nextFav = !model.isFavorite;
                                setCollection((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        models: prev.models.map((m) =>
                                          m.id === model.id ? { ...m, isFavorite: nextFav } : m
                                        ),
                                      }
                                    : null
                                );
                                await fetch(`/api/models/${model.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ isFavorite: nextFav }),
                                });
                              }}
                              className={`p-1 rounded transition-colors ${
                                model.isFavorite
                                  ? "text-amber-400 hover:text-amber-300"
                                  : "text-outline hover:text-on-surface"
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-[18px]"
                                style={{ fontVariationSettings: model.isFavorite ? "'FILL' 1" : "'FILL' 0" }}
                              >
                                star
                              </span>
                            </button>
                          </td>
                          <td
                            className="py-3 px-3 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleOpenQuickRename(model, e)}
                                className="p-1.5 rounded-lg bg-surface-container-lowest text-slate-300 hover:bg-indigo-600 hover:text-white transition-all border border-white/5"
                                title="Renomear"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleRemoveFromCollection(model.id, e)}
                                className="p-1.5 rounded-lg bg-surface-container-lowest text-rose-400 hover:bg-rose-500 hover:text-white transition-all border border-white/5"
                                title="Desvincular"
                              >
                                <FolderMinus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(auto-fill, minmax(${
                    viewMode === "compact" ? Math.max(180, zoomSize * 0.75) : zoomSize
                  }px, 1fr))`,
                }}
              >
                {paginatedModels.map((model) => {
                  const isSelected = selectedModelIds.includes(model.id);

                  return (
                    <div
                      key={model.id}
                      className={`relative group/wrapper rounded-xl transition-all ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-[#0b0e14]" : ""
                      }`}
                    >
                      {/* Checkbox de Seleção Múltipla */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectModel(model.id);
                        }}
                        className={`absolute top-3 left-3 z-30 w-6 h-6 rounded-lg flex items-center justify-center border transition-all backdrop-blur-md shadow-md ${
                          isSelected
                            ? "bg-primary-container border-primary-container text-on-primary opacity-100 scale-105"
                            : "bg-surface-container-lowest/80 border-white/20 text-white/50 opacity-0 group-hover/wrapper:opacity-100 hover:text-white hover:border-white/40"
                        }`}
                        title={isSelected ? "Desmarcar arquivo" : "Selecionar arquivo"}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </button>

                      <ModelCard
                        model={model}
                        onClick={() => handleOpenModel(model.id)}
                        viewMode={viewMode}
                        onFavoriteToggle={(id, state) => {
                          setCollection((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  models: prev.models.map((m) =>
                                    m.id === id ? { ...m, isFavorite: state } : m
                                  ),
                                }
                              : null
                          );
                        }}
                        onPrintedToggle={(id, state) => {
                          setCollection((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  models: prev.models.map((m) =>
                                    m.id === id ? { ...m, isPrinted: state } : m
                                  ),
                                }
                              : null
                          );
                        }}
                      />

                      {/* Botões de Ação Rápida */}
                      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 opacity-0 group-hover/wrapper:opacity-100 transition-opacity">
                        {/* Botão Renomear Modelo */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenQuickRename(model, e)}
                          className="p-1.5 rounded-lg bg-surface-container-lowest/85 text-slate-300 hover:bg-indigo-600 hover:text-white transition-all backdrop-blur-md shadow-md border border-white/10"
                          title="Renomear no disco e na interface"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Botão Desvincular da Coleção */}
                        <button
                          type="button"
                          onClick={(e) => handleRemoveFromCollection(model.id, e)}
                          className="p-1.5 rounded-lg bg-surface-container-lowest/85 text-rose-400 hover:bg-rose-500 hover:text-white transition-all backdrop-blur-md shadow-md border border-white/10"
                          title="Desvincular desta coleção"
                        >
                          <FolderMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Barra de Paginação da Coleção */}
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              totalCount={totalFilteredCount}
              pageSize={pageSize}
              currentCount={paginatedModels.length}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          </div>
        </main>
      </div>

      {/* Floating Action Bar quando houver itens selecionados */}
      {selectedModelIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 rounded-2xl bg-surface-container-highest/95 border border-white/15 backdrop-blur-xl shadow-2xl animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-white">
              {selectedModelIds.length}{" "}
              {selectedModelIds.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
            </span>
          </div>

          <div className="h-4 w-px bg-white/20" />

          <button
            type="button"
            onClick={handleSelectAll}
            className="text-xs text-slate-300 hover:text-white transition-colors"
          >
            {selectedModelIds.length === (collection?.models?.length || 0)
              ? "Desmarcar todos"
              : "Selecionar todos"}
          </button>

          <button
            type="button"
            onClick={handleOpenMoveModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary transition-all shadow-lg shadow-primary-container/30"
          >
            <FolderInput className="w-4 h-4" />
            <span>Mover para Coleção</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedModelIds([])}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Cancelar seleção"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal Mover Arquivos para Coleção */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-surface-container-low border border-white/10 shadow-2xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-container/20 border border-primary-container/30 text-primary">
                  <FolderInput className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-on-surface">Mover Arquivos de Coleção</h3>
                  <p className="text-xs text-on-surface-variant">
                    {selectedModelIds.length} {selectedModelIds.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMoveModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {moveError && (
              <div className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-xs text-error flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{moveError}</span>
              </div>
            )}

            {/* Aviso sobre movimentação física no disco */}
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
              <FolderTree className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Sincronização Física no Repositório:</span>
                <p className="text-[11px] text-on-surface-variant mt-0.5">
                  Os arquivos 3D, imagens de capa e manuais PDF serão movidos para a pasta da coleção no disco. Se já houver um arquivo com o mesmo nome, um sufixo numérico será criado automaticamente para preservar ambos.
                </p>
              </div>
            </div>

            {/* Alternador: Coleção Existente vs Criar Nova */}
            <div className="flex items-center p-1 rounded-xl bg-surface-container-lowest border border-white/5">
              <button
                type="button"
                onClick={() => setIsCreatingNewCol(false)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  !isCreatingNewCol
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Coleção Existente
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingNewCol(true)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isCreatingNewCol
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                + Criar Nova Coleção
              </button>
            </div>

            {!isCreatingNewCol ? (
              /* Seleção de Coleção Existente */
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Selecione a Coleção de Destino *
                </label>
                <select
                  value={targetCollectionId}
                  onChange={(e) => setTargetCollectionId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#0f121d] border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500 transition-all cursor-pointer"
                >
                  <option value="">Selecione uma coleção...</option>
                  {allCollections.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.folderPath ? c.folderPath : c.name}
                    </option>
                  ))}
                </select>
                {allCollections.length === 0 && (
                  <p className="text-[11px] text-amber-400 mt-1">
                    Nenhuma outra coleção encontrada. Use a opção &quot;Criar Nova Coleção&quot;.
                  </p>
                )}
              </div>
            ) : (
              /* Criação de Nova Coleção */
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Nome da Nova Coleção *
                  </label>
                  <input
                    type="text"
                    value={newColName}
                    onChange={(e) => setNewColName(e.target.value)}
                    placeholder="Ex: Miniaturas de RPG"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Uma pasta com este nome será criada no repositório de arquivos.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newColDesc}
                    onChange={(e) => setNewColDesc(e.target.value)}
                    placeholder="Ex: Arquivos prontos para impressão em resina"
                    className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Botões do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => setIsMoveModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={movingModels}
                onClick={handleConfirmMove}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-bold hover:bg-primary transition-all disabled:opacity-50 shadow-lg shadow-primary-container/30"
              >
                {movingModels ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Movendo Arquivos no Disco...</span>
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    <span>Confirmar e Mover</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Renomeação Rápida no Disco */}
      {modelToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-surface-container-low border border-white/10 shadow-2xl p-6 relative flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
                  <Pencil className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-on-surface">Renomear Arquivo e Modelo</h3>
              </div>
              <button
                onClick={() => setModelToRename(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {renameError && (
              <div className="p-3 rounded-xl bg-error-container/40 border border-error/30 text-xs text-error flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{renameError}</span>
              </div>
            )}

            <p className="text-xs text-on-surface-variant">
              O arquivo 3D principal, imagens de capa e manuais PDF serão renomeados na pasta física no repositório.
            </p>

            <form onSubmit={handleConfirmRename} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Novo Nome *
                </label>
                <input
                  type="text"
                  value={renameNewName}
                  onChange={(e) => setRenameNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setModelToRename(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={renaming || !renameNewName.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/30"
                >
                  {renaming ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Renomeando no Disco...</span>
                    </>
                  ) : (
                    <span>Salvar Alterações</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Vincular Modelos Existentes */}
      {isAddModelsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-on-surface">
                Vincular Modelos à Coleção
              </h2>
              <button
                onClick={() => setIsAddModelsOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchModelQuery}
                onChange={(e) => setSearchModelQuery(e.target.value)}
                placeholder="Filtrar modelos disponíveis..."
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg pl-9 pr-4 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="flex-1 overflow-y-auto min-h-[250px] max-h-[380px] flex flex-col gap-1.5 pr-1">
              {filteredAvailable.length === 0 ? (
                <div className="text-center py-12 text-xs text-on-surface-variant font-mono">
                  Nenhum modelo disponível para vincular.
                </div>
              ) : (
                filteredAvailable.map((m) => {
                  const isChecked = selectedToAdd.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleAddCandidate(m.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-primary-container/15 border-primary-container/40 text-on-surface"
                          : "bg-surface-container-lowest border-white/5 text-on-surface hover:bg-surface-container"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded bg-surface-container-high overflow-hidden flex-shrink-0">
                          {m.coverImage ? (
                            <img src={m.coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-outline">
                              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-semibold truncate">{m.name}</span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {m.library?.name}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                          isChecked
                            ? "bg-primary-container border-primary-container text-on-primary"
                            : "border-white/20 bg-surface-container-highest"
                        }`}
                      >
                        {isChecked && (
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <span className="text-xs text-on-surface-variant font-mono">
                {selectedToAdd.length} selecionados
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModelsOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:bg-surface-container-highest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={selectedToAdd.length === 0 || addingModels}
                  onClick={handleConfirmAddModels}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all disabled:opacity-50"
                >
                  {addingModels ? "Vinculando..." : "Vincular à Coleção"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Model Detail Modal */}
      {selectedModel && (
        <ModelDetailModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onUpdate={() => {
            fetchCollection();
            handleOpenModel(selectedModel.id);
          }}
        />
      )}
    </div>
  );
}
