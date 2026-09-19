"use client";

import React, { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/layout/Navbar";
import FilterBar from "@/components/gallery/FilterBar";
import ModelCard, { ModelCardData } from "@/components/gallery/ModelCard";
import ModelDetailModal, { ModelDetailData } from "@/components/model/ModelDetailModal";
import { Box, Sparkles, FolderTree, Layers, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [models, setModels] = useState<ModelCardData[]>([]);
  const [collections, setCollections] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [printedFilter, setPrintedFilter] = useState<"all" | "unprinted" | "printed">("all");
  const [selectedFormat, setSelectedFormat] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState("date_desc");
  const [totalCount, setTotalCount] = useState(0);
  const [selectedModel, setSelectedModel] = useState<ModelDetailData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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
    }, 250);
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

  const handleScanFinished = () => {
    fetchModels();
    fetchCollections();
  };

  const handlePrintedToggled = (id: string, newState: boolean) => {
    setModels((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, isPrinted: newState, printedAt: newState ? new Date().toISOString() : null } : m
      )
    );
    // Se estiver filtrando especificamente por nunca impressos ou impressos, recarrega para atualizar a contagem
    if (printedFilter !== "all") {
      setTimeout(() => fetchModels(), 300);
    }
  };

  const handleFavoriteToggled = (id: string, newState: boolean) => {
    setModels((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isFavorite: newState } : m))
    );
    if (favoritesOnly) {
      setTimeout(() => fetchModels(), 300);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        onScanTriggered={handleScanFinished}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Modelos e Projetos 3D</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Organize, inspecione malhas poligonais e visualize arquivos STL, 3MF e OBJ em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/collections"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Coleções</span>
            </Link>

            <Link
              href="/libraries"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all"
            >
              <FolderTree className="w-4 h-4 text-indigo-400" />
              <span>Bibliotecas</span>
            </Link>
          </div>
        </div>

        {/* Filter Controls (Search + Printed Status + Formats + Collections) */}
        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          printedFilter={printedFilter}
          onPrintedFilterChange={setPrintedFilter}
          selectedFormat={selectedFormat}
          onFormatSelect={setSelectedFormat}
          favoritesOnly={favoritesOnly}
          onToggleFavorites={() => setFavoritesOnly(!favoritesOnly)}
          sort={sort}
          onSortChange={setSort}
          totalCount={totalCount}
          collections={collections}
          selectedCollection={selectedCollection}
          onCollectionSelect={setSelectedCollection}
        />

        {/* Gallery Grid */}
        <div className="mt-6">
          {loading ? (
            /* Skeleton Loading Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-white/5 border border-white/5 overflow-hidden animate-pulse h-72"
                />
              ))}
            </div>
          ) : models.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  onClick={() => handleOpenModel(model.id)}
                  onFavoriteToggle={handleFavoriteToggled}
                  onPrintedToggle={handlePrintedToggled}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <Box className="w-8 h-8 text-indigo-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Nenhum modelo encontrado</h3>
              <p className="text-sm text-slate-400 max-w-md mb-6">
                {printedFilter === "unprinted"
                  ? "Todos os seus modelos já foram impressos!"
                  : printedFilter === "printed"
                  ? "Você ainda não marcou nenhum modelo como impresso."
                  : "Não há modelos que correspondam aos filtros atuais ou à busca digitada."}
              </p>
              <div className="flex items-center gap-3">
                {searchQuery || printedFilter !== "all" || selectedFormat || selectedCollection || favoritesOnly ? (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setPrintedFilter("all");
                      setSelectedFormat("");
                      setSelectedCollection("");
                      setFavoritesOnly(false);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <span>Limpar Filtros</span>
                  </button>
                ) : (
                  <Link
                    href="/libraries"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
                  >
                    <FolderTree className="w-4 h-4" />
                    <span>Configurar e Escanear Bibliotecas</span>
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Model Detail Modal */}
      {selectedModel && (
        <ModelDetailModal
          model={selectedModel}
          onClose={() => setSelectedModel(null)}
          onModelUpdated={(updated) => {
            setModels((prev) =>
              prev.map((m) =>
                m.id === updated.id
                  ? {
                      ...m,
                      name: updated.name,
                      coverImage: updated.coverImage,
                      isPrinted: updated.isPrinted,
                      printedAt: updated.printedAt,
                      filamentType: updated.filamentType,
                    }
                  : m
              )
            );
          }}
        />
      )}
    </div>
  );
}
