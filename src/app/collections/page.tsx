"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import {
  Layers,
  Plus,
  Box,
  Trash2,
  Edit2,
  FolderOpen,
  X,
  Check,
  Sparkles,
} from "lucide-react";

interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  coverImage: string | null;
  modelsCount: number;
  previewThumbnails: string[];
  createdAt: string;
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<CollectionItem | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (err) {
      console.error("Erro ao buscar coleções:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  const handleOpenCreate = () => {
    setFormName("");
    setFormDesc("");
    setErrorMsg("");
    setEditingCol(null);
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (col: CollectionItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingCol(col);
    setFormName(col.name);
    setFormDesc(col.description || "");
    setErrorMsg("");
    setIsCreateOpen(true);
  };

  const handleSaveCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setErrorMsg("O nome da coleção é obrigatório");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const url = editingCol ? `/api/collections/${editingCol.id}` : "/api/collections";
      const method = editingCol ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim(),
        }),
      });

      if (res.ok) {
        setIsCreateOpen(false);
        fetchCollections();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Erro ao salvar coleção");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Erro de conexão ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir a coleção "${name}"? Os modelos vinculados não serão deletados.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCollections((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error("Erro ao deletar coleção:", err);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Navbar onScanTriggered={fetchCollections} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Layers className="w-6 h-6" />
              </div>
              <span>Coleções</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Agrupe e organize seus modelos 3D em pastas lógicas ou coleções personalizadas.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Coleção</span>
          </button>
        </div>

        {/* Grid de Coleções */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-white/5 border border-white/5 animate-pulse"
              />
            ))}
          </div>
        ) : collections.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {collections.map((col) => (
              <Link
                key={col.id}
                href={`/collections/${col.id}`}
                className="group relative flex flex-col rounded-2xl bg-[#0e111d] border border-white/10 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden"
              >
                {/* Visual Preview / Cover */}
                <div className="relative w-full h-44 bg-[#080a12] border-b border-white/5 overflow-hidden flex items-center justify-center">
                  {col.coverImage ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={col.coverImage}
                      alt={col.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : col.previewThumbnails.length > 0 ? (
                    <div className="w-full h-full grid grid-cols-2 gap-0.5 p-1 bg-white/5">
                      {col.previewThumbnails.slice(0, 4).map((thumb, idx) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={idx}
                          src={thumb}
                          alt="preview"
                          className="w-full h-full object-cover rounded"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-600 group-hover:text-indigo-400 transition-colors">
                      <FolderOpen className="w-12 h-12 stroke-[1.2]" />
                      <span className="text-[11px] mt-2 font-medium">Sem modelos ainda</span>
                    </div>
                  )}

                  {/* Badge de Contagem */}
                  <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-white flex items-center gap-1.5">
                    <Box className="w-3 h-3 text-indigo-400" />
                    <span>{col.modelsCount} {col.modelsCount === 1 ? "modelo" : "modelos"}</span>
                  </div>

                  {/* Actions Dropdown / Buttons */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleOpenEdit(col, e)}
                      title="Editar Coleção"
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white hover:bg-white/20 transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteCollection(col.id, col.name, e)}
                      title="Excluir Coleção"
                      className="p-1.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Info */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                      {col.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {col.description || "Nenhuma descrição fornecida."}
                    </p>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Slug: {col.slug}</span>
                    <span className="text-indigo-400 group-hover:underline">Abrir &rarr;</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/[0.02]">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
              <Layers className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Nenhuma coleção encontrada</h3>
            <p className="text-sm text-slate-400 max-w-md mb-6">
              Coleções são criadas automaticamente a partir das pastas organizadas na sua biblioteca (ex: Canecas, Santos, Desenhos) ou podem ser criadas manualmente aqui.
            </p>
            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Criar Primeira Coleção</span>
            </button>
          </div>
        )}
      </main>

      {/* Modal Criar / Editar Coleção */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-[#0f121d] border border-white/10 shadow-2xl p-6 relative">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Layers className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-white">
                {editingCol ? "Editar Coleção" : "Nova Coleção"}
              </h2>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCollection} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome da Coleção *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Canecas Geek, Miniaturas D&D, Decorativos..."
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Descrição
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Breve descrição dos modelos desta coleção..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? "Salvando..." : editingCol ? "Salvar Alterações" : "Criar Coleção"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
