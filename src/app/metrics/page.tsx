"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  BarChart3,
  Box,
  HardDrive,
  Layers,
  PieChart,
  Calendar,
  Activity,
} from "lucide-react";

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
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setStats(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-indigo-400" />
            <span>Métricas & Visão Geral do Armazenamento</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Distribuição de formatos de impressão 3D, consumo de disco e histórico de varreduras.
          </p>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">Carregando métricas...</div>
        ) : !stats ? (
          <div className="p-12 text-center text-slate-400">Nenhum dado disponível.</div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400">Total de Modelos</span>
                  <div className="text-2xl font-bold text-white mt-1">{stats.totalModels}</div>
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Box className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400">Arquivos 3D Indexados</span>
                  <div className="text-2xl font-bold text-white mt-1">{stats.totalFiles}</div>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Layers className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400">Espaço em Disco</span>
                  <div className="text-2xl font-bold text-white mt-1">
                    {formatBytes(stats.totalSizeBytes)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <HardDrive className="w-6 h-6" />
                </div>
              </div>

              <div className="p-5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400">Bibliotecas Ativas</span>
                  <div className="text-2xl font-bold text-white mt-1">{stats.totalLibraries}</div>
                </div>
                <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400">
                  <PieChart className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Formats Distribution Breakdown */}
            <div className="p-6 rounded-2xl glass-card">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Distribuição de Formatos de Impressão</span>
              </h3>

              <div className="flex flex-col gap-4">
                {Object.entries(stats.formatDistribution).map(([format, count]) => {
                  const percentage =
                    stats.totalFiles > 0
                      ? Math.round((count / stats.totalFiles) * 100)
                      : 0;

                  return (
                    <div key={format} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-white uppercase tracking-wider">
                          .{format}
                        </span>
                        <span className="text-slate-400">
                          {count} arquivos ({percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            format === "3MF"
                              ? "bg-amber-400"
                              : format === "STL"
                              ? "bg-indigo-500"
                              : "bg-cyan-400"
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Scans Table */}
            <div className="p-6 rounded-2xl glass-card">
              <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-400" />
                <span>Histórico Recente de Varreduras</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400">
                      <th className="pb-3 font-medium">Biblioteca</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Pastas Processadas</th>
                      <th className="pb-3 font-medium">Novos Modelos</th>
                      <th className="pb-3 font-medium">Iniciado Em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {stats.recentScans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-4 text-center text-slate-500">
                          Nenhuma varredura registrada ainda.
                        </td>
                      </tr>
                    ) : (
                      stats.recentScans.map((scan) => (
                        <tr key={scan.id} className="text-slate-300">
                          <td className="py-3 font-medium text-white">{scan.library.name}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                scan.status === "COMPLETED"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : scan.status === "RUNNING"
                                  ? "bg-indigo-500/10 text-indigo-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {scan.status}
                            </span>
                          </td>
                          <td className="py-3">{scan.scannedCount}</td>
                          <td className="py-3 text-emerald-400 font-semibold">+{scan.addedCount}</td>
                          <td className="py-3 text-slate-400 font-mono">
                            {new Date(scan.startedAt).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
