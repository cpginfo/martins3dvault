"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

interface LibraryItem {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  lastScanAt: string | null;
  scanStatus: string;
  lastError: string | null;
  modelsCount: number;
  existsOnDisk: boolean;
  lastJob: {
    status: string;
    scannedCount: number;
    addedCount: number;
    updatedCount: number;
    log: string | null;
    completedAt: string | null;
  } | null;
}

export default function LibrariesPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [isScanningAll, setIsScanningAll] = useState(false);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [newLibPath, setNewLibPath] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Stats state from real database
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

  const fetchLibraries = async () => {
    try {
      const res = await fetch("/api/libraries");
      if (res.ok) {
        const data = await res.json();
        setLibraries(data);
      }
    } catch (err) {
      console.error("Erro ao buscar bibliotecas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraries();
    fetchStats();
  }, []);

  const handleScan = async (id: string) => {
    setScanningId(id);
    try {
      const res = await fetch(`/api/libraries/${id}/scan`, { method: "POST" });
      if (res.ok) {
        await Promise.all([fetchLibraries(), fetchStats()]);
      }
    } catch (err) {
      console.error("Erro ao escanear biblioteca:", err);
    } finally {
      setScanningId(null);
    }
  };

  const handleScanAll = async () => {
    setIsScanningAll(true);
    try {
      for (const lib of libraries) {
        await fetch(`/api/libraries/${lib.id}/scan`, { method: "POST" });
      }
      await Promise.all([fetchLibraries(), fetchStats()]);
    } catch (err) {
      console.error("Erro ao escanear tudo:", err);
    } finally {
      setIsScanningAll(false);
    }
  };

  const handleCreateLibrary = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setCreating(true);

    try {
      const res = await fetch("/api/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLibName, path: newLibPath }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Falha ao criar biblioteca");
      }

      setNewLibName("");
      setNewLibPath("");
      setShowAddForm(false);
      await Promise.all([fetchLibraries(), fetchStats()]);
    } catch (err: any) {
      setFormError(err.message || "Erro desconhecido ao salvar biblioteca");
    } finally {
      setCreating(false);
    }
  };

  const totalIndexedModels = libraries.reduce((acc, l) => acc + (l.modelsCount || 0), 0);

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
        <Navbar isSidebarCollapsed={isSidebarCollapsed} onScanTriggered={() => { fetchLibraries(); fetchStats(); }} />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-6 pt-6">
            {/* Top Engine Status HUD Banner */}
            <div className="relative overflow-hidden rounded-xl bg-surface-container-low shadow-xl p-6 border border-white/5">
              <div className="absolute -right-16 -top-16 w-96 h-96 rounded-full bg-secondary-container/10 blur-3xl pointer-events-none"></div>
              <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-primary-container/10 blur-2xl pointer-events-none"></div>

              <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 rounded-xl bg-surface-container-highest/60 flex items-center justify-center text-secondary shadow-inner border border-white/5">
                    <span className="material-symbols-outlined text-[32px]">folder_managed</span>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold text-on-surface tracking-tight">
                        Mapeamento de Pastas & Indexação
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-highest text-tertiary text-[11px] font-mono border border-white/5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isScanningAll || scanningId
                              ? "bg-primary-container animate-ping"
                              : "bg-tertiary animate-pulse"
                          }`}
                        ></span>
                        {isScanningAll || scanningId
                          ? "Varredura em Execução..."
                          : "Pronto para Varredura"}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
                      Gerencie as pastas do servidor local ou volumes de rede montados para catalogação automática de arquivos{" "}
                      <span className="font-mono text-primary">.STL</span>,{" "}
                      <span className="font-mono text-secondary">.3MF</span> e{" "}
                      <span className="font-mono text-tertiary">.OBJ</span>.
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-on-surface-variant text-xs font-mono">
                      <span className="flex items-center gap-1 text-primary">
                        <span className="material-symbols-outlined text-[16px]">folder</span>
                        {libraries.length} {libraries.length === 1 ? "biblioteca configurada" : "bibliotecas configuradas"}
                      </span>
                      <span className="text-outline-variant">•</span>
                      <span className="flex items-center gap-1 text-secondary">
                        <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
                        {totalIndexedModels} modelos indexados
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-start lg:justify-end">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="px-4 py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold flex items-center gap-2 transition-all border border-white/5"
                  >
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      add_circle
                    </span>
                    <span>Novo Ponto de Montagem</span>
                  </button>
                  <button
                    onClick={handleScanAll}
                    disabled={isScanningAll}
                    className="px-5 py-2.5 rounded-lg bg-primary-container hover:bg-primary text-on-primary text-xs font-bold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(249,115,22,0.35)] active:scale-[0.98] disabled:opacity-60"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        isScanningAll ? "animate-spin" : ""
                      }`}
                    >
                      sync
                    </span>
                    <span>{isScanningAll ? "Escaneando Todas..." : "Escanear Todas as Pastas"}</span>
                  </button>
                </div>
              </div>

              {/* Real Database Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/5">
                <div className="bg-surface-container p-3.5 rounded-lg flex flex-col gap-1 border border-white/5">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    Modelos Catalogados
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-on-surface font-mono">
                      {stats ? stats.totalModels : totalIndexedModels}
                    </span>
                    <span className="text-[10px] text-secondary font-mono">Vault</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-1">
                    <div className="bg-secondary h-full w-full"></div>
                  </div>
                </div>

                <div className="bg-surface-container p-3.5 rounded-lg flex flex-col gap-1 border border-white/5">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    Arquivos 3D no Banco
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-on-surface font-mono">
                      {stats ? stats.totalFiles : "..."}
                    </span>
                    <span className="text-[10px] text-tertiary font-mono">Prontos</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-1">
                    <div className="bg-tertiary h-full w-full"></div>
                  </div>
                </div>

                <div className="bg-surface-container p-3.5 rounded-lg flex flex-col gap-1 border border-white/5">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    Espaço Ocupado
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-on-surface font-mono">
                      {stats ? formatBytes(stats.totalSizeBytes) : "..."}
                    </span>
                    <span className="text-[10px] text-primary-container font-mono">Arquivos 3D</span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-1">
                    <div className="bg-primary-container h-full w-full"></div>
                  </div>
                </div>

                <div className="bg-surface-container p-3.5 rounded-lg flex flex-col gap-1 border border-white/5">
                  <span className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider">
                    Pastas Ativas
                  </span>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-on-surface font-mono">
                      {libraries.filter((l) => l.enabled).length} de {libraries.length}
                    </span>
                    <span className="text-[10px] text-tertiary font-mono">
                      {libraries.every((l) => l.existsOnDisk) ? "OK no Disco" : "Verificar"}
                    </span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden mt-1">
                    <div className="bg-tertiary h-full w-full"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mapped Directories Section */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-6 rounded bg-primary-container"></div>
                  <div className="flex flex-col">
                    <h2 className="text-base font-bold text-on-surface tracking-tight">
                      Diretórios Mapeados no Sistema
                    </h2>
                    <span className="text-xs text-on-surface-variant">
                      Pontos de montagem vigiados pelo Inotify / FileSystem Crawler
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-semibold border border-white/5"
                >
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  <span>Mapear Nova Pasta</span>
                </button>
              </div>

              {/* Form de Adicionar Novo Ponto de Montagem */}
              {showAddForm && (
                <div className="p-5 rounded-xl bg-surface-container-low border border-white/10 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-on-surface">
                      Mapear Novo Ponto de Montagem
                    </h3>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="text-on-surface-variant hover:text-on-surface p-1"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  {formError && (
                    <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-xs">
                      {formError}
                    </div>
                  )}

                  <form onSubmit={handleCreateLibrary} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-on-surface">Nome Amigável</label>
                      <input
                        type="text"
                        value={newLibName}
                        onChange={(e) => setNewLibName(e.target.value)}
                        placeholder="Ex: Peças Técnicas Voron"
                        className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-on-surface">
                        Caminho Absoluto ou Volume Docker
                      </label>
                      <input
                        type="text"
                        value={newLibPath}
                        onChange={(e) => setNewLibPath(e.target.value)}
                        placeholder="Ex: /libraries ou /mnt/nas/stl"
                        className="bg-surface-container-lowest border border-white/10 rounded-lg px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary-container font-mono"
                        required
                      />
                    </div>

                    <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 rounded-lg bg-surface-container-high text-on-surface text-xs font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        className="px-4 py-2 rounded-lg bg-primary-container text-on-primary text-xs font-bold hover:bg-primary transition-all disabled:opacity-50"
                      >
                        {creating ? "Salvando..." : "Salvar e Iniciar Scan"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table of Libraries */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-on-surface-variant">
                  <span className="material-symbols-outlined text-[36px] animate-spin text-primary-container">
                    sync
                  </span>
                  <span className="text-xs font-mono">Carregando diretórios montados...</span>
                </div>
              ) : libraries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl bg-surface-container-low border border-white/5 text-center gap-3">
                  <span className="material-symbols-outlined text-[36px] text-outline">
                    folder_off
                  </span>
                  <h3 className="text-sm font-semibold text-on-surface">Nenhum diretório mapeado</h3>
                  <p className="text-xs text-on-surface-variant">
                    Clique em &quot;Novo Ponto de Montagem&quot; para conectar uma pasta de arquivos 3D.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {libraries.map((lib) => {
                    const isScanning = scanningId === lib.id || isScanningAll;
                    return (
                      <div
                        key={lib.id}
                        className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/10 transition-colors"
                      >
                        <div className="flex items-start gap-3.5 min-w-0">
                          <div className="p-2.5 rounded-lg bg-surface-container-highest text-secondary flex-shrink-0">
                            <span className="material-symbols-outlined text-[24px]">hard_drive</span>
                          </div>

                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-on-surface truncate">
                                {lib.name}
                              </h3>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                                  lib.existsOnDisk
                                    ? "bg-tertiary/20 text-tertiary"
                                    : "bg-error/20 text-error"
                                }`}
                              >
                                {lib.existsOnDisk ? "Disco Montado" : "Não Encontrado"}
                              </span>
                            </div>

                            <span className="text-xs font-mono text-on-surface-variant truncate mt-0.5">
                              {lib.path}
                            </span>

                            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-outline">
                              <span>{lib.modelsCount} modelos rastreados</span>
                              <span>•</span>
                              <span>
                                Último scan:{" "}
                                {lib.lastScanAt
                                  ? new Date(lib.lastScanAt).toLocaleString("pt-BR")
                                  : "Nunca"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Scan Action */}
                        <div className="flex items-center gap-2.5 self-end md:self-auto">
                          <button
                            onClick={() => handleScan(lib.id)}
                            disabled={isScanning}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-all border border-white/5 disabled:opacity-50"
                          >
                            <span
                              className={`material-symbols-outlined text-[16px] text-primary-container ${
                                isScanning ? "animate-spin" : ""
                              }`}
                            >
                              sync
                            </span>
                            <span>{isScanning ? "Varrendo..." : "Escanear Pasta"}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
