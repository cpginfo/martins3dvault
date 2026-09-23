"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";

interface StatsData {
  totalModels: number;
  totalLibraries: number;
  totalFiles: number;
  totalSizeBytes: number;
  formatDistribution: Record<string, number>;
  recentScans: Array<{
    id: string;
    status: string;
    scannedCount: number;
    addedCount: number;
    startedAt: string;
    library: { name: string };
  }>;
  cache?: {
    sizeBytes: number;
    fileCount: number;
  };
}

export default function MetricsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    setClearingCache(true);
    setCacheMessage(null);
    try {
      const res = await fetch("/api/cache", { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao limpar o cache.");
      }
      const data = await res.json();
      setCacheMessage({
        type: "success",
        text: `Cache limpo com sucesso! ${formatBytes(data.freedBytes)} liberados em ${data.deletedFiles} ${data.deletedFiles === 1 ? "arquivo" : "arquivos"}.`,
      });
      setShowClearConfirm(false);
      await fetchStats();
    } catch (err: any) {
      setCacheMessage({
        type: "error",
        text: err.message || "Erro ao limpar cache.",
      });
    } finally {
      setClearingCache(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

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
        <Navbar isSidebarCollapsed={isSidebarCollapsed} onScanTriggered={fetchStats} />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-6 pt-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-surface-container-low shadow-sm border border-white/5">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-surface-container text-primary-container border border-white/5">
                  <span className="material-symbols-outlined text-[28px]">analytics</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-on-surface tracking-tight">
                    Métricas & Visão Geral do Armazenamento
                  </h1>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Estatísticas reais do banco de dados, distribuição de formatos e consumo de disco.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-highest text-tertiary text-xs font-mono border border-white/5">
                  <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
                  Banco Online
                </span>
                <button
                  onClick={fetchStats}
                  className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors"
                  title="Atualizar métricas"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                </button>
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-on-surface-variant font-mono text-sm">
                Carregando estatísticas...
              </div>
            ) : !stats ? (
              <div className="p-12 text-center text-on-surface-variant font-mono text-sm">
                Nenhum dado disponível no momento.
              </div>
            ) : (
              <>
                {/* 4 Real Bento KPI Cards */}
                <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Total Models */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                          Total de Modelos
                        </span>
                        <div className="text-2xl font-bold text-on-surface font-mono mt-1">
                          {stats.totalModels}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container text-primary-container">
                        <span className="material-symbols-outlined text-[22px]">view_in_ar</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-primary-container w-full"></div>
                    </div>
                  </div>

                  {/* Total Files */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                          Arquivos 3D Indexados
                        </span>
                        <div className="text-2xl font-bold text-on-surface font-mono mt-1">
                          {stats.totalFiles}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container text-secondary">
                        <span className="material-symbols-outlined text-[22px]">layers</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-secondary w-full"></div>
                    </div>
                  </div>

                  {/* Total Storage Space */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                          Espaço em Disco
                        </span>
                        <div className="text-2xl font-bold text-on-surface font-mono mt-1">
                          {formatBytes(stats.totalSizeBytes)}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container text-tertiary">
                        <span className="material-symbols-outlined text-[22px]">hard_drive</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-tertiary w-full"></div>
                    </div>
                  </div>

                  {/* Total Libraries */}
                  <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col justify-between gap-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                          Bibliotecas Ativas
                        </span>
                        <div className="text-2xl font-bold text-on-surface font-mono mt-1">
                          {stats.totalLibraries}
                        </div>
                      </div>
                      <div className="p-2 rounded-lg bg-surface-container text-secondary-container">
                        <span className="material-symbols-outlined text-[22px]">folder</span>
                      </div>
                    </div>
                    <div className="w-full h-1 rounded-full bg-surface-container-highest overflow-hidden">
                      <div className="h-full bg-secondary-container w-full"></div>
                    </div>
                  </div>
                </section>

                {/* Seção de Cache de Renderização e Limpeza */}
                <section className="p-5 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-4 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                        <span className="material-symbols-outlined text-[26px]">memory</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-on-surface tracking-tight">
                            Cache de Renderização 3D
                          </h2>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-surface-container-highest text-on-surface-variant border border-white/5">
                            /data/cache
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant max-w-xl">
                          Armazena malhas binárias (.stl) pré-convertidas de arquivos .3mf para carregamento ultrarrápido no Three.js (Modo Studio). Pode ser limpo a qualquer momento sem afetar os arquivos do seu acervo.
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-amber-300 font-mono text-xs font-semibold border border-white/5">
                            {formatBytes(stats.cache?.sizeBytes || 0)} ocupados
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-mono text-xs border border-white/5">
                            {stats.cache?.fileCount || 0} {stats.cache?.fileCount === 1 ? "malha salva" : "malhas salvas"}
                          </span>
                          {(!stats.cache || stats.cache.sizeBytes === 0) && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-tertiary/10 text-tertiary border border-tertiary/20">
                              Cache Vazio
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                      {!showClearConfirm ? (
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(true)}
                          disabled={clearingCache || !stats.cache || stats.cache.sizeBytes === 0}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-error-container/30 text-on-surface hover:text-error text-xs font-semibold transition-all border border-white/10 hover:border-error/40 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                          title={
                            !stats.cache || stats.cache.sizeBytes === 0
                              ? "O cache já está vazio"
                              : "Liberar espaço ocupado pelo cache de malhas 3D"
                          }
                        >
                          <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                          <span>Limpar Cache</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 p-2 rounded-xl bg-surface-container border border-error/30 animate-fadeIn">
                          <span className="text-xs text-error font-medium px-2">
                            Confirmar limpeza?
                          </span>
                          <button
                            type="button"
                            onClick={handleClearCache}
                            disabled={clearingCache}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-error text-white text-xs font-semibold hover:bg-error/90 transition-all disabled:opacity-50 shadow-sm"
                          >
                            {clearingCache ? (
                              <>
                                <span className="material-symbols-outlined text-[16px] animate-spin">
                                  sync
                                </span>
                                <span>Limpando...</span>
                              </>
                            ) : (
                              <span>Sim, Limpar</span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowClearConfirm(false)}
                            disabled={clearingCache}
                            className="px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface text-xs font-medium transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {cacheMessage && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 border animate-fadeIn ${
                        cacheMessage.type === "success"
                          ? "bg-tertiary/10 border-tertiary/30 text-tertiary"
                          : "bg-error-container/40 border-error/30 text-error"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">
                          {cacheMessage.type === "success" ? "check_circle" : "error"}
                        </span>
                        <span>{cacheMessage.text}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCacheMessage(null)}
                        className="p-1 rounded hover:bg-white/10 text-on-surface-variant hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Formats Distribution Breakdown */}
                <section className="p-5 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-6 rounded bg-secondary"></div>
                    <h2 className="text-base font-bold text-on-surface tracking-tight">
                      Distribuição de Formatos de Impressão 3D
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(stats.formatDistribution || {}).map(([format, count]) => {
                      const percentage =
                        stats.totalFiles > 0
                          ? Math.round((count / stats.totalFiles) * 100)
                          : 0;

                      return (
                        <div
                          key={format}
                          className="p-3.5 rounded-lg bg-surface-container flex flex-col gap-2 border border-white/5"
                        >
                          <div className="flex items-center justify-between font-mono text-xs">
                            <span className="font-bold text-primary uppercase">.{format}</span>
                            <span className="text-on-surface-variant">
                              {count} arquivos ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                format === "3MF"
                                  ? "bg-primary-container"
                                  : format === "STL"
                                  ? "bg-secondary"
                                  : "bg-tertiary"
                              }`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>

                {/* Recent Scans Table */}
                <section className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-6 rounded bg-tertiary"></div>
                    <h2 className="text-base font-bold text-on-surface tracking-tight">
                      Histórico Recente de Varreduras
                    </h2>
                  </div>

                  <div className="w-full overflow-x-auto rounded-xl bg-surface-container-low border border-white/5 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-outline bg-surface-container-lowest">
                          <th className="py-3 px-4">Biblioteca</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Pastas Processadas</th>
                          <th className="py-3 px-4">Novos Modelos</th>
                          <th className="py-3 px-4">Iniciado Em</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {stats.recentScans.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-6 text-center text-on-surface-variant">
                              Nenhuma varredura registrada ainda.
                            </td>
                          </tr>
                        ) : (
                          stats.recentScans.map((scan) => (
                            <tr
                              key={scan.id}
                              className="hover:bg-surface-container-high transition-colors text-on-surface"
                            >
                              <td className="py-3 px-4 font-semibold text-primary">
                                {scan.library?.name || "Geral"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    scan.status === "COMPLETED"
                                      ? "bg-tertiary/15 text-tertiary"
                                      : scan.status === "RUNNING"
                                      ? "bg-primary-container/15 text-primary-container"
                                      : "bg-error/15 text-error"
                                  }`}
                                >
                                  {scan.status === "COMPLETED" ? "Concluído" : scan.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-on-surface-variant">
                                {scan.scannedCount}
                              </td>
                              <td className="py-3 px-4 text-tertiary font-bold">
                                +{scan.addedCount}
                              </td>
                              <td className="py-3 px-4 text-outline text-[11px]">
                                {new Date(scan.startedAt).toLocaleString("pt-BR")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
