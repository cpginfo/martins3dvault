"use client";

import React, { useState, useEffect, useCallback } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import FilterBar, { ViewMode } from "@/components/gallery/FilterBar";
import ModelCard, { ModelCardData } from "@/components/gallery/ModelCard";
import ModelDetailModal, { ModelDetailData } from "@/components/model/ModelDetailModal";
import UploadModal from "@/components/upload/UploadModal";
import Link from "next/link";

export default function HomePage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [models, setModels] = useState<ModelCardData[]>([]);
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [printedFilter, setPrintedFilter] = useState<"all" | "unprinted" | "printed">("all");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedPolymer, setSelectedPolymer] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState("date_desc");
  const [totalCount, setTotalCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [zoomSize, setZoomSize] = useState(280);
  const [viewMode, setViewMode] = useState<ViewMode>("large");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Sync initial query parameter ?q=... if present
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const q = urlParams.get("q");
      if (q) setSearchQuery(q);
      const p = urlParams.get("printed");
      if (p === "false") setPrintedFilter("unprinted");
      else if (p === "true") setPrintedFilter("printed");
    }
  }, []);

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (err) {
      console.error("Erro ao buscar coleções:", err);
    }
  };

  const fetchModels = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("q", searchQuery);
      if (selectedFormat) params.set("format", selectedFormat);
      if (selectedCollection) params.set("collectionId", selectedCollection);
      if (favoritesOnly) params.set("favorite", "true");
      if (printedFilter === "unprinted") params.set("printed", "false");
      if (printedFilter === "printed") params.set("printed", "true");
      if (sort) params.set("sort", sort);

      const res = await fetch(`/api/models?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setModels(data.items || []);
        setTotalCount(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error("Erro ao buscar modelos:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedFormat, selectedCollection, favoritesOnly, printedFilter, sort]);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchModels();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchModels]);

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

  // Filter models by polymer client-side if selected
  const filteredModels = selectedPolymer
    ? models.filter((m) =>
        m.files.some(
          (f) =>
            f.fileName.toLowerCase().includes(selectedPolymer.toLowerCase()) ||
            (m.filamentType &&
              m.filamentType.toLowerCase().includes(selectedPolymer.toLowerCase()))
        )
      )
    : models;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Persistent Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      {/* Main Container offset by sidebar width */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "pl-20" : "pl-72"
        }`}
      >
        {/* Top Navbar */}
        <Navbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onScanTriggered={() => {
            fetchCollections();
            fetchModels();
          }}
          selectedFormat={selectedFormat}
          onFormatChange={setSelectedFormat}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Main Content Area */}
        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-5">
            {/* Sub-Header & Breadcrumb Bar from Stitch */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 text-on-surface-variant text-xs font-medium">
                  <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">home</span>
                    <span>Início</span>
                  </Link>
                  {selectedCollection && (
                    <>
                      <span className="text-outline">/</span>
                      <Link href="/collections" className="hover:text-primary transition-colors">
                        Coleções
                      </Link>
                    </>
                  )}
                  <span className="text-outline">/</span>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-surface-container-high border border-white/5">
                  <span className="material-symbols-outlined text-[18px] text-primary-container">
                    layers
                  </span>
                  <span className="text-xs text-on-surface font-semibold">
                    {selectedCollection
                      ? collections.find((c) => c.id === selectedCollection)?.name || "Coleção"
                      : "Todos os Modelos 3D"}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary text-[11px] font-mono">
                  {filteredModels.length} {filteredModels.length === 1 ? "Modelo" : "Modelos"}
                </span>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-2.5">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-low text-on-surface-variant text-xs border border-white/5">
                  <span className="material-symbols-outlined text-[16px] text-tertiary">
                    check_circle
                  </span>
                  <span>Banco Sincronizado</span>
                </div>
                <Link
                  href="/collections"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors text-xs font-medium border border-white/5"
                >
                  <span className="material-symbols-outlined text-[16px]">drive_file_move</span>
                  <span>Organizar Coleções</span>
                </Link>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                >
                  <span className="material-symbols-outlined text-[16px]">cloud_upload</span>
                  <span>Adicionar Modelo</span>
                </button>
              </div>
            </div>

            {/* Eagle-style Studio Control & Filter Bar */}
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              printedFilter={printedFilter}
              onPrintedFilterChange={setPrintedFilter}
              selectedFormat={selectedFormat}
              onFormatSelect={setSelectedFormat}
              favoritesOnly={favoritesOnly}
              onToggleFavorites={() => setFavoritesOnly((prev) => !prev)}
              sort={sort}
              onSortChange={setSort}
              totalCount={totalCount}
              collections={collections}
              selectedCollection={selectedCollection}
              onCollectionSelect={setSelectedCollection}
              zoomSize={zoomSize}
              onZoomChange={setZoomSize}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedPolymer={selectedPolymer}
              onPolymerSelect={setSelectedPolymer}
            />

            {/* Gallery View (Grid or Table) */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
                  sync
                </span>
                <span className="text-xs font-mono">Indexando arquivos 3D no cofre...</span>
              </div>
            ) : filteredModels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 rounded-2xl bg-surface-container-low border border-white/5 text-center gap-3">
                <div className="p-4 rounded-full bg-surface-container-highest text-primary-container">
                  <span className="material-symbols-outlined text-[40px]">view_in_ar</span>
                </div>
                <h3 className="font-semibold text-base text-on-surface">Nenhum modelo encontrado</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  {searchQuery || selectedFormat || printedFilter !== "all"
                    ? "Tente ajustar os filtros ou pesquisar por outro termo."
                    : "Mapeie um diretório local ou faça o upload de arquivos STL / 3MF para começar."}
                </p>
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                  <span>Fazer Upload Agora</span>
                </button>
              </div>
            ) : viewMode === "table" ? (
              <div className="w-full overflow-x-auto rounded-xl bg-surface-container-low border border-white/5 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-outline bg-surface-container-lowest">
                      <th className="py-3 px-3">Modelo / Biblioteca</th>
                      <th className="py-3 px-3">Extensão</th>
                      <th className="py-3 px-3">Dimensões (XYZ)</th>
                      <th className="py-3 px-3">Arquivos</th>
                      <th className="py-3 px-3">Status de Impressão</th>
                      <th className="py-3 px-3 text-right">Favorito</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModels.map((model) => (
                      <ModelCard
                        key={model.id}
                        model={model}
                        onClick={() => handleOpenModel(model.id)}
                        viewMode="table"
                        onFavoriteToggle={(id, state) => {
                          setModels((prev) =>
                            prev.map((m) => (m.id === id ? { ...m, isFavorite: state } : m))
                          );
                        }}
                        onPrintedToggle={(id, state) => {
                          setModels((prev) =>
                            prev.map((m) => (m.id === id ? { ...m, isPrinted: state } : m))
                          );
                        }}
                      />
                    ))}
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
                {filteredModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onClick={() => handleOpenModel(model.id)}
                    viewMode={viewMode}
                    onFavoriteToggle={(id, state) => {
                      setModels((prev) =>
                        prev.map((m) => (m.id === id ? { ...m, isFavorite: state } : m))
                      );
                    }}
                    onPrintedToggle={(id, state) => {
                      setModels((prev) =>
                        prev.map((m) => (m.id === id ? { ...m, isPrinted: state } : m))
                      );
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Model Detail Modal with 3D Viewer */}
      {selectedModel && (
        <ModelDetailModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onUpdate={() => {
            fetchModels();
            handleOpenModel(selectedModel.id);
          }}
        />
      )}

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={fetchModels}
      />
    </div>
  );
}
