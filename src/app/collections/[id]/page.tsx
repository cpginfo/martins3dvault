"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import ModelCard, { ModelCardData } from "@/components/gallery/ModelCard";
import ModelDetailModal, { ModelDetailData } from "@/components/model/ModelDetailModal";
import {
  Layers,
  ArrowLeft,
  Plus,
  Trash2,
  Edit2,
  Box,
  Check,
  X,
  Search,
  FolderMinus,
} from "lucide-react";

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
        // Filtra para mostrar apenas modelos que NÃO estão nesta coleção
        const currentModelIds = new Set(collection?.models.map((m) => m.id) || []);
        const nonMembers = (data.items || []).filter(
          (m: ModelCardData) => !currentModelIds.has(m.id)
        );
        setAvailableModels(nonMembers);
      }
    } catch (err) {
      console.error("Erro ao carregar modelos disponíveis:", err);
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
        body: JSON.stringify({
          modelIds: selectedToAdd,
          action: "add",
        }),
      });
      if (res.ok) {
        setIsAddModelsOpen(false);
        fetchCollection();
      }
    } catch (err) {
      console.error("Erro ao adicionar modelos à coleção:", err);
    } finally {
      setAddingModels(false);
    }
  };

  const handleRemoveFromCollection = async (modelId: string, modelName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Remover "${modelName}" desta coleção? O modelo não será excluído do sistema.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/collections/${id}/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIds: [modelId],
          action: "remove",
        }),
      });
      if (res.ok) {
        setCollection((prev) =>
          prev ? { ...prev, models: prev.models.filter((m) => m.id !== modelId) } : null
        );
      }
    } catch (err) {
      console.error("Erro ao remover modelo da coleção:", err);
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

  const filteredAvailable = availableModels.filter((m) =>
    m.name.toLowerCase().includes(searchModelQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Navbar onScanTriggered={fetchCollection} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Breadcrumbs & Back link */}
        <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
          <Link href="/collections" className="flex items-center gap-1 hover:text-white transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Coleções</span>
          </Link>
          <span>/</span>
          <span className="text-slate-200 font-medium">{collection?.name || "Carregando..."}</span>
        </div>

        {/* Collection Header Banner */}
        {loading ? (
          <div className="h-36 rounded-2xl bg-white/5 border border-white/5 animate-pulse mb-8" />
        ) : collection ? (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl bg-[#0e111d] border border-white/10 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-indigo-500/20 shrink-0">
                <div className="w-full h-full bg-[#0d101d] rounded-[15px] flex items-center justify-center">
                  <Layers className="w-7 h-7 text-indigo-400" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                  <span>{collection.name}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-normal">
                    {collection.models.length} {collection.models.length === 1 ? "modelo" : "modelos"}
                  </span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
                  {collection.description || "Coleção de modelos para impressão 3D."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleOpenAddModels}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Modelos</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400">Coleção não encontrada.</div>
        )}

        {/* Models Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-2xl bg-white/5 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : collection && collection.models.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {collection.models.map((model) => (
              <div key={model.id} className="relative group">
                <ModelCard
                  model={model}
                  onClick={() => handleOpenModel(model.id)}
                />
                {/* Botão de desvincular da coleção */}
                <button
                  onClick={(e) => handleRemoveFromCollection(model.id, model.name, e)}
                  title="Remover desta Coleção"
                  className="absolute top-2.5 left-2.5 z-20 p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 opacity-0 group-hover:opacity-100 transition-all duration-200"
                >
                  <FolderMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Box className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Esta coleção está vazia</h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Vincule modelos já existentes ou adicione novos arquivos a esta coleção.
            </p>
            <button
              onClick={handleOpenAddModels}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Modelos Agora</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal Adicionar Modelos */}
      {isAddModelsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg rounded-2xl bg-[#0f121d] border border-white/10 shadow-2xl p-6 relative max-h-[85vh] flex flex-col">
            <button
              onClick={() => setIsAddModelsOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Adicionar Modelos à Coleção</h2>
                <p className="text-xs text-slate-400">Selecione os modelos que deseja vincular a &quot;{collection?.name}&quot;</p>
              </div>
            </div>

            {/* Busca */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchModelQuery}
                onChange={(e) => setSearchModelQuery(e.target.value)}
                placeholder="Filtrar modelos por nome..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
              />
            </div>

            {/* Lista de Modelos Disponíveis */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((m) => {
                  const isChecked = selectedToAdd.includes(m.id);
                  return (
                    <div
                      key={m.id}
                      onClick={() => handleToggleSelectModel(m.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-indigo-600/15 border-indigo-500/40 text-white"
                          : "bg-white/[0.02] border-white/5 hover:bg-white/5 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                          {m.coverImage ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={m.coverImage} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-semibold block truncate">{m.name}</span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {m.library?.name || "Sem biblioteca"} • {m.files?.length || 0} arquivo(s)
                          </span>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ml-3 ${
                          isChecked
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "border-white/20 bg-white/5"
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  Nenhum modelo disponível para adicionar.
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/5">
              <span className="text-xs text-slate-400">
                {selectedToAdd.length} selecionado(s)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModelsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddModels}
                  disabled={selectedToAdd.length === 0 || addingModels}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-40"
                >
                  <Check className="w-4 h-4" />
                  <span>{addingModels ? "Adicionando..." : "Adicionar à Coleção"}</span>
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
          onModelUpdated={(updated) => {
            setCollection((prev) =>
              prev
                ? {
                    ...prev,
                    models: prev.models.map((m) =>
                      m.id === updated.id ? { ...m, coverImage: updated.coverImage } : m
                    ),
                  }
                : null
            );
          }}
        />
      )}
    </div>
  );
}
