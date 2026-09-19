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

  // Mock active queue jobs representing the 3D workshop farm
  const [queueJobs, setQueueJobs] = useState([
    {
      id: "job-01",
      filename: "Stealthburner_Main_Body_v2.gcode",
      printer: "Voron 2.4 R2 350",
      filament: "ABS Preto",
      progress: 68,
      layer: "342/510",
      eta: "1h 14m",
      nozzleTemp: "245°C",
      bedTemp: "105°C",
      status: "PRINTING",
    },
    {
      id: "job-02",
      filename: "Nevermore_V6_Cartridge.gcode",
      printer: "Bambu Lab X1C #1",
      filament: "ASA Cinza",
      progress: 42,
      layer: "128/305",
      eta: "48m",
      nozzleTemp: "250°C",
      bedTemp: "100°C",
      status: "PRINTING",
    },
    {
      id: "job-03",
      filename: "Gridfinity_Bin_2x3x6.gcode",
      printer: "Prusa MK4",
      filament: "PETG Laranja",
      progress: 89,
      layer: "210/235",
      eta: "18m",
      nozzleTemp: "235°C",
      bedTemp: "85°C",
      status: "PRINTING",
    },
    {
      id: "job-04",
      filename: "Mini_V-Wheel_Mount.gcode",
      printer: "Ender 3 V3 KE",
      filament: "PLA Preto",
      progress: 0,
      layer: "0/180",
      eta: "Em Espera",
      nozzleTemp: "25°C",
      bedTemp: "25°C",
      status: "STANDBY",
    },
  ]);

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
        <Navbar isSidebarCollapsed={isSidebarCollapsed} />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-6 pb-12">
          <div className="flex flex-col w-full gap-6 pt-6">
            {/* Operational Breadcrumbs & Emergency Topbar from Stitch */}
            <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-low shadow-sm border border-white/5">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2 text-on-surface-variant text-xs">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] text-primary-container px-2 py-0.5 rounded bg-surface-container-highest border border-white/5">
                    <span className="material-symbols-outlined text-[14px]">
                      precision_manufacturing
                    </span>
                    OFICINA 01 (OPERADOR)
                  </span>
                  <span className="text-outline font-mono">/</span>
                  <span className="text-xs text-secondary font-mono">Bancada Física Sul</span>
                  <span className="text-outline font-mono">/</span>
                  <span className="font-mono text-[11px] text-on-surface-variant">
                    vlt-print-01.lan (192.168.1.180)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-on-surface tracking-tight">
                    Fila de Produção & Telemetria
                  </h1>
                  <span className="flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-surface-container-high text-tertiary text-xs font-mono border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-tertiary animate-ping"></span>
                    3 Ativas • 1 Standby
                  </span>
                </div>
              </div>

              {/* Global Tactical Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => alert("Comando enviado: Fila pausada temporariamente.")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all text-xs font-semibold border border-white/5"
                >
                  <span className="material-symbols-outlined text-[18px] text-error">
                    pause_circle
                  </span>
                  <span>Pausar Fila Geral</span>
                </button>
                <button
                  onClick={() => alert("Pré-aquecimento iniciado para perfis Voron/Bambu.")}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-high text-secondary hover:bg-surface-container-highest transition-all text-xs font-semibold border border-white/5"
                >
                  <span className="material-symbols-outlined text-[18px]">thermostat</span>
                  <span>Calibrar Pré-aquecimento</span>
                </button>
              </div>
            </section>

            {/* 4-Bento KPI Telemetry Grid from Stitch */}
            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {/* KPI 1 */}
              <div className="relative overflow-hidden p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-3 shadow-sm border border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                      Impressoras Operando
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-on-surface font-mono">3</span>
                      <span className="text-base text-outline font-mono">/ 4</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-highest text-secondary">
                    <span className="material-symbols-outlined text-[24px]">view_in_ar</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span>Voron • X1C • Prusa</span>
                    <span className="text-tertiary">75% Carga</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden flex">
                    <div className="h-full bg-primary-container w-[75%]"></div>
                  </div>
                </div>
              </div>

              {/* KPI 2 */}
              <div className="relative overflow-hidden p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-3 shadow-sm border border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                      Job Prioritário
                    </span>
                    <span className="text-xs font-bold text-primary truncate max-w-[180px] mt-1">
                      Stealthburner_Main_Body_v2.gcode
                    </span>
                    <span className="text-[11px] text-secondary font-mono mt-0.5">Voron 2.4 R2</span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-highest text-primary-container">
                    <span className="material-symbols-outlined text-[24px]">hourglass_top</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Camada 342/510</span>
                    <span className="text-primary font-bold">68% • Restam 1h 14m</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary-container to-secondary w-[68%]"></div>
                  </div>
                </div>
              </div>

              {/* KPI 3 */}
              <div className="relative overflow-hidden p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-3 shadow-sm border border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                      Filamento / Custo Hoje
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-2xl font-bold text-on-surface font-mono">605g</span>
                      <span className="text-xs text-tertiary font-mono">~R$ 54,40</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-highest text-tertiary">
                    <span className="material-symbols-outlined text-[24px]">scale</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 text-[11px] font-mono">
                  <div className="flex items-center justify-between text-on-surface-variant">
                    <span>ABS: 380g • ASA: 140g • PETG: 85g</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden flex">
                    <div className="h-full bg-primary-container w-[60%]"></div>
                    <div className="h-full bg-secondary w-[25%]"></div>
                    <div className="h-full bg-tertiary w-[15%]"></div>
                  </div>
                </div>
              </div>

              {/* KPI 4 */}
              <div className="relative overflow-hidden p-4 rounded-xl bg-surface-container-low flex flex-col justify-between gap-3 shadow-sm border border-white/5">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-outline">
                      Telemetria Térmica
                    </span>
                    <div className="flex items-baseline gap-2 mt-1 font-mono">
                      <span className="text-sm font-bold text-primary">Nozzle: 245°C</span>
                      <span className="text-sm font-bold text-secondary">Mesa: 105°C</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-highest text-primary">
                    <span className="material-symbols-outlined text-[24px]">thermostat</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-tertiary">
                  <span>Câmara: 48°C Estável</span>
                  <span>PWM Fan 100%</span>
                </div>
              </div>
            </section>

            {/* Print Farm Queue Table */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-6 rounded bg-primary-container"></div>
                  <h2 className="text-base font-bold text-on-surface tracking-tight">
                    Fila de Impressão na Bancada (Farm Real-Time)
                  </h2>
                </div>
              </div>

              <div className="w-full overflow-x-auto rounded-xl bg-surface-container-low border border-white/5 shadow-sm">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-outline bg-surface-container-lowest">
                      <th className="py-3 px-4">Arquivo G-Code</th>
                      <th className="py-3 px-4">Impressora Designada</th>
                      <th className="py-3 px-4">Filamento</th>
                      <th className="py-3 px-4">Progresso & Camada</th>
                      <th className="py-3 px-4">Temperaturas</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueJobs.map((job) => (
                      <tr
                        key={job.id}
                        className="border-b border-white/5 hover:bg-surface-container-high transition-colors font-mono"
                      >
                        <td className="py-3.5 px-4 font-semibold text-on-surface">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px] text-primary-container">
                              description
                            </span>
                            <span className="truncate max-w-xs">{job.filename}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-secondary">{job.printer}</td>
                        <td className="py-3.5 px-4 text-on-surface-variant">{job.filament}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col gap-1 w-36">
                            <div className="flex justify-between text-[10px]">
                              <span>{job.progress}%</span>
                              <span className="text-outline">{job.layer}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                              <div
                                className="h-full bg-primary-container rounded-full"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[11px] text-on-surface-variant">
                          <span>{job.nozzleTemp}</span> / <span>{job.bedTemp}</span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => alert(`Ação executada no job ${job.filename}`)}
                            className="px-2.5 py-1 rounded bg-surface-container-highest hover:bg-surface-container-high text-on-surface transition-colors text-[11px]"
                          >
                            Detalhes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Storage Index & Formats Breakdown */}
            {stats && (
              <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-primary">pie_chart</span>
                    <span>Distribuição de Formatos 3D no Storage</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1 font-mono text-xs">
                    {Object.entries(stats.formatDistribution || {}).map(([fmt, count]) => (
                      <div
                        key={fmt}
                        className="p-2.5 rounded-lg bg-surface-container-lowest border border-white/5 flex flex-col"
                      >
                        <span className="text-outline text-[10px] uppercase">.{fmt}</span>
                        <span className="text-base font-bold text-on-surface mt-0.5">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-3">
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      history
                    </span>
                    <span>Últimas Varreduras do Scanner</span>
                  </h3>
                  <div className="flex flex-col gap-2 font-mono text-xs">
                    {stats.recentScans && stats.recentScans.length > 0 ? (
                      stats.recentScans.slice(0, 4).map((scan) => (
                        <div
                          key={scan.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-surface-container-lowest border border-white/5"
                        >
                          <span className="truncate max-w-[50%]">{scan.library?.name}</span>
                          <span className="text-tertiary">+{scan.addedCount} novos</span>
                          <span className="text-outline text-[10px]">
                            {new Date(scan.startedAt).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-outline text-center py-6 text-xs">
                        Nenhuma varredura recente registrada.
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
