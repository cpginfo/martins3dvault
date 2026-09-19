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
}

export default function MetricsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

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
