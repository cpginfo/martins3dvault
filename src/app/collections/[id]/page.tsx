"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import ModelCard, { ModelCardData } from "@/components/gallery/ModelCard";
import ModelDetailModal, { ModelDetailData } from "@/components/model/ModelDetailModal";

interface CollectionDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
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

  // Modal para adicionar modelos existentes
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
  }, [id]);

  const handleOpenAddModels = async () => {
    setIsAddModelsOpen(true);
    setSelectedToAdd([]);
    try {
      const res = await fetch("/api/models?limit=100");
      if (res.ok) {
        const data = await res.json();
        const existingIds = new Set((collection?.models || []).map((m) => m.id));
        setAvailableModels((data.items || []).filter((m: ModelCardData) => !existingIds.has(m.id)));
      }
    } catch (err) {
      console.error("Erro ao buscar modelos disponíveis:", err);
    }
  };

  const handleToggleSelectModel = (modelId: string) => {
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
        <Navbar isSidebarCollapsed={isSidebarCollapsed} />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-5 pt-5">
            {/* Breadcrumb Navigation */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                <Link
                  href="/collections"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                  <span>Coleções</span>
                </Link>
                <span className="text-outline">/</span>
                <span className="text-on-surface font-semibold truncate max-w-xs">
                  {collection?.name || "Carregando..."}
                </span>
              </div>

              <div className="flex items-center gap-2">
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
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded bg-surface-container-highest text-secondary text-[11px] font-mono">
                      {collection?.models.length || 0} arquivos vinculados
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Models Grid */}
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
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {collection.models.map((model) => (
                  <div key={model.id} className="relative group/wrapper">
                    <ModelCard
                      model={model}
                      onClick={() => handleOpenModel(model.id)}
                    />
                    <button
                      type="button"
                      onClick={(e) => handleRemoveFromCollection(model.id, e)}
                      className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-surface-container-lowest/80 text-error hover:bg-error-container hover:text-white opacity-0 group-hover/wrapper:opacity-100 transition-opacity backdrop-blur-md shadow-md"
                      title="Desvincular desta coleção"
                    >
                      <span className="material-symbols-outlined text-[16px]">folder_minus</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

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
                      onClick={() => handleToggleSelectModel(m.id)}
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
