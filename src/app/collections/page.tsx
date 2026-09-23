"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

interface CollectionItem {
  id: string;
  name: string;
  slug: string;
  folderPath?: string | null;
  parentId?: string | null;
  description: string | null;
  coverImage: string | null;
  modelsCount: number;
  childrenCount?: number;
  previewThumbnails: string[];
  createdAt: string;
  children?: CollectionItem[];
}

function CollectionTreeCard({
  col,
  onEdit,
  onDelete,
  level = 0,
}: {
  col: CollectionItem;
  onEdit: (col: CollectionItem, e: React.MouseEvent) => void;
  onDelete: (id: string, name: string, e: React.MouseEvent) => void;
  level?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = col.children && col.children.length > 0;

  return (
    <div className="flex flex-col">
      <div
        className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low hover:bg-surface-container border border-white/5 transition-all group my-1"
        style={{ marginLeft: `${level * 24}px` }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
              title={isExpanded ? "Recolher subcoleções" : "Expandir subcoleções"}
            >
              <span
                className={`material-symbols-outlined text-[18px] transition-transform inline-block ${
                  isExpanded ? "rotate-90" : ""
                }`}
              >
                chevron_right
              </span>
            </button>
          ) : (
            <span className="w-6 flex-shrink-0" />
          )}

          <Link
            href={`/collections/${col.id}`}
            className="flex items-center gap-2.5 min-w-0 group-hover:text-primary transition-colors flex-1"
          >
            <div className="p-2 rounded-lg bg-surface-container-highest text-primary-container flex-shrink-0">
              <span className="material-symbols-outlined text-[20px]">folder</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-on-surface truncate group-hover:text-primary">
                {col.name}
              </span>
              <span className="text-[11px] font-mono text-outline truncate">
                {col.folderPath || col.name}
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs font-mono text-on-surface-variant px-2 py-0.5 rounded-md bg-surface-container-high border border-white/5">
            {col.modelsCount} modelo{col.modelsCount !== 1 ? "s" : ""}
          </span>
          {hasChildren && (
            <span className="text-xs font-mono text-secondary px-2 py-0.5 rounded-md bg-secondary/10 border border-secondary/20">
              {col.children!.length} subpasta{col.children!.length !== 1 ? "s" : ""}
            </span>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => onEdit(col, e)}
              className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-[16px]">edit</span>
            </button>
            <button
              onClick={(e) => onDelete(col.id, col.name, e)}
              className="p-1.5 rounded-lg hover:bg-error-container text-error transition-colors"
              title="Excluir"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div className="flex flex-col border-l-2 border-white/5 ml-4 pl-1">
          {col.children!.map((child) => (
            <CollectionTreeCard
              key={child.id}
              col={child}
              onEdit={onEdit}
              onDelete={onDelete}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collections, setCollections] = useState<CollectionItem[]>([]);
  const [treeCollections, setTreeCollections] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCol, setEditingCol] = useState<CollectionItem | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "tree">("grid");

  // Form states
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Stats from database
  const [stats, setStats] = useState<{
    totalModels: number;
    totalFiles: number;
    totalLibraries: number;
    totalSizeBytes: number;
  } | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Erro ao buscar estatísticas:", err);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const [resFlat, resTree] = await Promise.all([
        fetch("/api/collections"),
        fetch("/api/collections?tree=true"),
      ]);
      if (resFlat.ok) {
        const data = await resFlat.json();
        setCollections(data);
      }
      if (resTree.ok) {
        const treeData = await resTree.json();
        setTreeCollections(treeData);
      }
    } catch (err) {
      console.error("Erro ao buscar coleções:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    fetchStats();
  }, []);

  const handleOpenCreate = () => {
    setFormName("");
    setFormDesc("");
    setFormParentId("");
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
    setFormParentId(col.parentId || "");
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
          parentId: formParentId || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao salvar coleção");
      }

      setIsCreateOpen(false);
      window.dispatchEvent(new Event("refreshCollections"));
      fetchCollections();
    } catch (err: any) {
      setErrorMsg(err.message || "Ocorreu um erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async (id: string, name: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Tem certeza que deseja excluir a coleção "${name}"? Os modelos permanecerão no cofre.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/collections/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchCollections();
      }
    } catch (err) {
      console.error("Erro ao excluir coleção:", err);
    }
  };

  const filtered = searchQuery
    ? collections.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : collections;

  const totalModelsInCollections = collections.reduce((acc, c) => acc + (c.modelsCount || 0), 0);

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
          onSearchChange={setSearchQuery}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-6">
            {/* Quick Stats Metric Header Strip from Stitch */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
              {/* Metric 1: Total Models */}
              <div className="bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
                    Modelos em Coleções
                  </span>
                  <div className="p-1.5 rounded-lg bg-surface-container text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">view_in_ar</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-on-surface tracking-tight font-mono">
                    {totalModelsInCollections}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="material-symbols-outlined text-[14px] text-tertiary">
                      trending_up
                    </span>
                    <span className="text-[11px] text-tertiary font-mono">Organizados</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-3 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full w-[78%]"></div>
                </div>
              </div>

              {/* Metric 2: Active Collections */}
              <div className="bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
                    Agrupamentos
                  </span>
                  <div className="p-1.5 rounded-lg bg-surface-container text-secondary">
                    <span className="material-symbols-outlined text-[20px]">folder_special</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-on-surface tracking-tight font-mono">
                    {collections.length}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      Coleções Ativas no Vault
                    </span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-3 overflow-hidden">
                  <div className="bg-secondary h-full rounded-full w-[92%]"></div>
                </div>
              </div>

              {/* Metric 3: Total Models in Vault */}
              <div className="bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
                    Total no Cofre
                  </span>
                  <div className="p-1.5 rounded-lg bg-surface-container text-tertiary">
                    <span className="material-symbols-outlined text-[20px]">database</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-on-surface tracking-tight font-mono">
                    {stats ? stats.totalModels : totalModelsInCollections}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                    <span className="text-on-surface-variant">Modelos Cadastrados</span>
                    <span className="text-tertiary font-semibold">100% Indexados</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-3 overflow-hidden">
                  <div className="bg-tertiary h-full rounded-full w-full"></div>
                </div>
              </div>

              {/* Metric 4: Storage Used */}
              <div className="bg-surface-container-low rounded-xl p-4 shadow-sm flex flex-col justify-between relative overflow-hidden border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-outline">
                    Espaço Ocupado
                  </span>
                  <div className="p-1.5 rounded-lg bg-surface-container text-primary-container">
                    <span className="material-symbols-outlined text-[20px]">hard_drive</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-on-surface tracking-tight font-mono">
                    {stats ? formatBytes(stats.totalSizeBytes) : "..."}
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                    <span className="text-on-surface-variant">{stats ? `${stats.totalFiles} arquivos 3D` : "Calculando..."}</span>
                    <span className="text-primary-container font-semibold">Disco OK</span>
                  </div>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full mt-3 overflow-hidden">
                  <div className="bg-primary-container h-full rounded-full w-full"></div>
                </div>
              </div>
            </section>

            {/* Sub-Header Bar & Create CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-6 rounded bg-primary-container"></div>
                <h1 className="text-lg font-semibold text-on-surface tracking-tight">
                  Painel de Coleções
                </h1>
                <span className="text-xs font-mono text-on-surface-variant ml-2">
                  {filtered.length} organizadas
                </span>
              </div>

              <div className="flex items-center gap-2.5">
                {/* View Mode Toggle: Grid vs Tree */}
                <div className="flex items-center p-0.5 rounded-lg bg-surface-container-high border border-white/5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "grid"
                        ? "bg-primary-container text-on-primary font-bold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    title="Visualização em Grade"
                  >
                    <span className="material-symbols-outlined text-[16px]">grid_view</span>
                    <span>Grade</span>
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      viewMode === "tree"
                        ? "bg-primary-container text-on-primary font-bold shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface"
                    }`}
                    title="Visualização em Árvore Hierárquica"
                  >
                    <span className="material-symbols-outlined text-[16px]">account_tree</span>
                    <span>Árvore</span>
                  </button>
                </div>

                <button
                  onClick={handleOpenCreate}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_12px_rgba(249,115,22,0.35)]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Nova Coleção</span>
                </button>
              </div>
            </div>

            {/* Collections Content */}
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-on-surface-variant">
                <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
                  sync
                </span>
                <span className="text-xs font-mono">Carregando coleções...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl bg-surface-container-low border border-white/5 text-center gap-3">
                <div className="p-4 rounded-full bg-surface-container-highest text-primary-container">
                  <span className="material-symbols-outlined text-[36px]">folder_open</span>
                </div>
                <h3 className="font-semibold text-base text-on-surface">Nenhuma coleção cadastrada</h3>
                <p className="text-xs text-on-surface-variant max-w-sm">
                  Crie coleções temáticas como &quot;Upgrades Voron&quot;, &quot;Miniaturas RPG&quot; ou &quot;Peças Técnicas&quot;.
                </p>
                <button
                  onClick={handleOpenCreate}
                  className="mt-2 flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span>
                  <span>Criar Primeira Coleção</span>
                </button>
              </div>
            ) : viewMode === "tree" ? (
              <div className="flex flex-col gap-1 p-4 rounded-2xl bg-surface-container-low border border-white/5 shadow-inner">
                <div className="flex items-center justify-between pb-3 mb-2 border-b border-white/5 text-xs font-mono text-outline">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">folder_copy</span>
                    <span>Estrutura de Pastas e Subcoleções</span>
                  </span>
                  <span>{treeCollections.length} coleções na raiz</span>
                </div>
                {treeCollections.map((col) => (
                  <CollectionTreeCard
                    key={col.id}
                    col={col}
                    onEdit={handleOpenEdit}
                    onDelete={handleDeleteCollection}
                    level={0}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filtered.map((col) => (
                  <Link
                    key={col.id}
                    href={`/collections/${col.id}`}
                    className="group relative flex flex-col rounded-xl bg-surface-container-low border border-white/5 hover:border-primary-container/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 p-4 gap-3"
                  >
                    {/* Header: Icon & Actions */}
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-lg bg-surface-container-highest text-secondary group-hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-[24px]">folder</span>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(col, e)}
                          className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                          title="Editar coleção"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCollection(col.id, col.name, e)}
                          className="p-1 rounded-md text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors"
                          title="Excluir coleção"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>

                    {/* Titles */}
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                        {col.name}
                      </h3>
                      {col.description ? (
                        <p className="text-xs text-on-surface-variant line-clamp-2">
                          {col.description}
                        </p>
                      ) : (
                        <p className="text-xs text-outline italic">Sem descrição</p>
                      )}
                    </div>

                    {/* Preview Thumbnails strip */}
                    <div className="flex items-center gap-1.5 py-1">
                      {col.previewThumbnails && col.previewThumbnails.length > 0 ? (
                        col.previewThumbnails.slice(0, 4).map((thumb, idx) => (
                          <div
                            key={idx}
                            className="w-10 h-10 rounded bg-surface-container-lowest overflow-hidden border border-white/5 flex-shrink-0"
                          >
                            <img
                              src={thumb}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="w-full h-10 rounded bg-surface-container-lowest flex items-center justify-center text-[10px] font-mono text-outline border border-white/5">
                          Vazio
                        </div>
                      )}
                    </div>

                    {/* Footer count */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] font-mono text-on-surface-variant">
                      <span>{col.modelsCount} modelos</span>
                      <span className="text-secondary group-hover:translate-x-0.5 transition-transform">
                        Abrir →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Modal Criar / Editar Coleção */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-surface-container-low border border-white/10 rounded-2xl shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-on-surface">
                {editingCol ? "Editar Coleção" : "Nova Coleção"}
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSaveCollection} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Nome da Coleção</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Peças Técnicas Voron 2.4"
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Coleção Pai (Opcional)</label>
                <select
                  value={formParentId}
                  onChange={(e) => setFormParentId(e.target.value)}
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                >
                  <option value="">Nenhuma (Coleção Raiz)</option>
                  {collections
                    .filter((c) => !editingCol || c.id !== editingCol.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.folderPath ? c.folderPath : c.name}
                      </option>
                    ))}
                </select>
                <span className="text-[10px] text-on-surface-variant font-mono">
                  Selecione uma coleção pai para aninhar esta subcoleção em pasta.
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-on-surface">Descrição (Opcional)</label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Finalidade, especificações ou notas de impressão..."
                  rows={3}
                  className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium hover:bg-surface-container-highest transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all disabled:opacity-50"
                >
                  {saving ? "Salvando..." : editingCol ? "Salvar Alterações" : "Criar Coleção"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
