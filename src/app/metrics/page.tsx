"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import { useToast } from "@/components/ui/ToastContext";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export interface CurrentScanState {
  isScanning: boolean;
  jobId: string | null;
  libraryId: string | null;
  libraryName: string | null;
  trigger: "MANUAL" | "STARTUP" | null;
  phase: string;
  currentFolder: string;
  currentModel: string;
  processedFolders: number;
  totalFolders: number;
  processedModels: number;
  totalModels: number;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  deletedCount: number;
  percentage: number;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  errorMessage: string | null;
}

interface StatsData {
  totalModels: number;
  totalLibraries: number;
  totalFiles: number;
  totalSizeBytes: number;
  formatDistribution: Record<string, number>;
  currentScan?: CurrentScanState;
  recentScans: Array<{
    id: string;
    status: string;
    scannedCount: number;
    addedCount: number;
    updatedCount?: number;
    deletedCount?: number;
    startedAt: string;
    completedAt?: string | null;
    log?: string | null;
    trigger: "MANUAL" | "STARTUP";
    library: { name: string };
  }>;
  cache?: {
    sizeBytes: number;
    fileCount: number;
  };
  concurrency?: {
    globalActiveSlots: number;
    maxGlobalSlots: number;
    maxUserSlots: number;
    activeUsersCount: number;
    activeUsers: Array<{ userId: string; activeSlots: number }>;
    inFlightConversionsCount: number;
    blockedUsersCount: number;
    activeBlocks: Array<{ userId: string; remainingSeconds: number; reason?: string }>;
  };
  downloadLogs?: Array<{
    id: string;
    userId: string;
    userEmail?: string;
    filePath?: string;
    timestamp: string;
    result: string;
    statusCode: number;
    message?: string;
  }>;
}

export default function MetricsPage() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [scanProgress, setScanProgress] = useState<CurrentScanState | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingCache, setClearingCache] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [cacheMessage, setCacheMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { toast } = useToast();
  const [backups, setBackups] = useState<
    Array<{
      fileName: string;
      sizeBytes: number;
      createdAt: string;
      downloadUrl: string;
    }>
  >([]);
  const [loadingBackups, setLoadingBackups] = useState(false);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [restoringBackup, setRestoringBackup] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<{
    fileName: string;
    sizeBytes: number;
    createdAt: string;
    downloadUrl: string;
  } | null>(null);
  const [backupToDelete, setBackupToDelete] = useState<{
    fileName: string;
    sizeBytes: number;
    createdAt: string;
    downloadUrl: string;
  } | null>(null);
  const [deletingBackup, setDeletingBackup] = useState(false);

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const res = await fetch("/api/database/backups");
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups || []);
      }
    } catch (err) {
      console.error("Erro ao carregar backups:", err);
    } finally {
      setLoadingBackups(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await fetch("/api/database/backup?download=false");
      if (res.ok) {
        const data = await res.json();
        toast.success(`Backup ${data.fileName} criado com sucesso em /data/backups!`);
        fetchBackups();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Falha ao criar backup.");
      }
    } catch {
      toast.error("Erro de conexão ao criar backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setRestoringBackup(true);
    try {
      const res = await fetch("/api/database/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: backupToRestore.fileName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success("Banco de dados restaurado com sucesso!");
        fetchStats();
        setBackupToRestore(null);
      } else {
        toast.error(data.error || "Erro ao restaurar banco de dados.");
      }
    } catch {
      toast.error("Erro ao comunicar com o servidor para restauração.");
    } finally {
      setRestoringBackup(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;
    setDeletingBackup(true);
    try {
      const res = await fetch(`/api/database/backups/${encodeURIComponent(backupToDelete.fileName)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Backup ${backupToDelete.fileName} excluído com sucesso.`);
        fetchBackups();
        setBackupToDelete(null);
      } else {
        toast.error(data.error || "Erro ao excluir backup.");
      }
    } catch {
      toast.error("Erro ao excluir backup.");
    } finally {
      setDeletingBackup(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.currentScan) {
          setScanProgress(data.currentScan);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      setLoading(false);
    }
  };

  // Polling em tempo real enquanto houver varredura ativa
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    const checkScanStatus = async () => {
      try {
        const res = await fetch("/api/scan/status");
        if (res.ok) {
          const data = await res.json();
          if (data.progress) {
            setScanProgress((prev) => {
              // Se estava escaneando e finalizou, recarrega o histórico
              if (prev?.isScanning && !data.progress.isScanning) {
                fetchStats();
              }
              return data.progress;
            });
          }
        }
      } catch (err) {
        console.error("Erro ao consultar status da varredura:", err);
      }
    };

    if (scanProgress?.isScanning) {
      interval = setInterval(checkScanStatus, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [scanProgress?.isScanning]);

  // Listener para eventos globais de disparo de varredura
  useEffect(() => {
    const handleScanEvent = () => {
      fetch("/api/scan/status")
        .then((res) => res.json())
        .then((data) => {
          if (data.progress) {
            setScanProgress(data.progress);
          }
        })
        .catch(() => {});
    };

    window.addEventListener("scanStatusChanged", handleScanEvent);
    return () => {
      window.removeEventListener("scanStatusChanged", handleScanEvent);
    };
  }, []);

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

  const handleResetCircuitBreaker = async () => {
    try {
      const res = await fetch("/api/security/circuit-breaker/reset", { method: "POST" });
      if (res.ok) {
        await fetchStats();
      }
    } catch (err) {
      console.error("Erro ao resetar circuit breaker:", err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const formatDuration = (startedAt: string, completedAt?: string | null) => {
    if (!completedAt) return "Em execução...";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const diffSec = Math.max(0, Math.round((end - start) / 1000));
    if (diffSec < 60) return `${diffSec}s`;
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return `${mins}m ${secs}s`;
  };

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
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 pl-0 ${
          isSidebarCollapsed ? "lg:pl-20" : "sidebar-pl-dynamic"
        }`}
      >
        <Navbar
          isSidebarCollapsed={isSidebarCollapsed}
          onScanTriggered={fetchStats}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
        />

        <main className="relative pt-16 bg-surface min-h-screen w-full px-3 sm:px-6 pb-12">
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

                {/* Seção de Backup e Segurança do Banco de Dados */}
                <section className="p-5 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-5 shadow-sm relative overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shrink-0">
                        <span className="material-symbols-outlined text-[26px]">database</span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-on-surface tracking-tight">
                            Backup & Segurança do Banco de Dados
                          </h2>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-surface-container-highest text-on-surface-variant border border-white/5">
                            PostgreSQL 16
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant max-w-xl">
                          Exporta e salva um instantâneo completo em JSON de todas as tabelas (contas, bibliotecas, coleções, modelos, tags, histórico de precificação e orçamentos). Salvo automaticamente em <code className="text-indigo-300 font-mono">/data/backups</code>.
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-indigo-300 font-mono text-xs font-semibold border border-white/5">
                            {stats.totalModels} modelos indexados
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-mono text-xs border border-white/5">
                            {stats.totalLibraries} bibliotecas
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-surface-container text-indigo-400 font-mono text-xs border border-white/5">
                            {backups.length} instantâneo(s) salvo(s)
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-center shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={handleCreateBackup}
                        disabled={creatingBackup}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md hover:shadow-indigo-500/20 active:scale-95 cursor-pointer"
                        title="Gerar e salvar um novo instantâneo no disco agora"
                      >
                        <span className={`material-symbols-outlined text-[18px] ${creatingBackup ? "animate-spin" : ""}`}>
                          {creatingBackup ? "progress_activity" : "save"}
                        </span>
                        <span>{creatingBackup ? "Criando Backup..." : "Criar Backup Agora"}</span>
                      </button>

                      <a
                        href="/api/database/backup?download=true"
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-white/10 text-on-surface text-xs font-semibold transition-all cursor-pointer"
                        title="Baixar instantâneo completo do banco diretamente no navegador"
                      >
                        <span className="material-symbols-outlined text-[18px] text-indigo-400">download</span>
                        <span>Baixar Cópia Direta</span>
                      </a>
                    </div>
                  </div>

                  {/* Lista de Backups Existentes */}
                  <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-indigo-400">history</span>
                        Instantâneos Armazenados (/data/backups)
                      </h3>
                      <button
                        type="button"
                        onClick={fetchBackups}
                        disabled={loadingBackups}
                        className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 transition-colors cursor-pointer"
                        title="Atualizar lista de backups"
                      >
                        <span className={`material-symbols-outlined text-sm ${loadingBackups ? "animate-spin" : ""}`}>
                          refresh
                        </span>
                        Atualizar
                      </button>
                    </div>

                    {loadingBackups ? (
                      <div className="py-6 flex items-center justify-center text-on-surface-variant text-xs gap-2">
                        <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                        Carregando backups existentes...
                      </div>
                    ) : backups.length === 0 ? (
                      <div className="py-6 px-4 rounded-xl bg-surface-container/50 border border-white/5 text-center text-xs text-on-surface-variant">
                        Nenhum arquivo de backup encontrado na pasta local <code className="text-indigo-300 font-mono">/data/backups</code>. Clique em &quot;Criar Backup Agora&quot; acima para gerar sua primeira cópia de segurança.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-surface-container/40">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-white/5 text-[11px] font-semibold text-on-surface-variant bg-surface-container-high/40">
                              <th className="py-2.5 px-4">Arquivo</th>
                              <th className="py-2.5 px-4">Tamanho</th>
                              <th className="py-2.5 px-4">Criado em</th>
                              <th className="py-2.5 px-4 text-right">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 font-mono">
                            {backups.map((b) => (
                              <tr key={b.fileName} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-2.5 px-4 text-on-surface font-semibold flex items-center gap-2">
                                  <span className="material-symbols-outlined text-sm text-indigo-400">description</span>
                                  <span className="truncate max-w-xs sm:max-w-md">{b.fileName}</span>
                                </td>
                                <td className="py-2.5 px-4 text-on-surface-variant">
                                  {formatBytes(b.sizeBytes)}
                                </td>
                                <td className="py-2.5 px-4 text-on-surface-variant font-sans text-[11px]">
                                  {new Date(b.createdAt).toLocaleString("pt-BR")}
                                </td>
                                <td className="py-2.5 px-4 text-right font-sans">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <a
                                      href={b.downloadUrl}
                                      download={b.fileName}
                                      className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-indigo-400 border border-white/5 transition-colors"
                                      title="Baixar arquivo de backup"
                                    >
                                      <span className="material-symbols-outlined text-base block">download</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => setBackupToRestore(b)}
                                      className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                      title="Restaurar este instantâneo no banco de dados"
                                    >
                                      <span className="material-symbols-outlined text-xs">settings_backup_restore</span>
                                      Restaurar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setBackupToDelete(b)}
                                      className="p-1.5 rounded-lg bg-surface-container hover:bg-red-500/15 text-on-surface-variant hover:text-red-400 border border-white/5 transition-colors cursor-pointer"
                                      title="Excluir arquivo de backup"
                                    >
                                      <span className="material-symbols-outlined text-base block">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* Seção de Segurança, Concorrência e Observabilidade de Downloads */}
                <section className="p-5 rounded-xl bg-surface-container-low border border-white/5 flex flex-col gap-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-6 rounded bg-primary"></div>
                      <div>
                        <h2 className="text-base font-bold text-on-surface tracking-tight flex items-center gap-2">
                          <span>Segurança de Downloads & Concorrência</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase">
                            Proteção Ativa
                          </span>
                        </h2>
                        <p className="text-xs text-on-surface-variant">
                          Controle de exaustão de CPU com limites por usuário, fila global e locks single-flight
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 4 Cards de Métricas de Concorrência */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-surface-container flex flex-col justify-between border border-white/5">
                      <div className="flex items-center justify-between text-on-surface-variant mb-2">
                        <span className="text-xs font-semibold">Slots Globais</span>
                        <span className="material-symbols-outlined text-[20px] text-primary">hub</span>
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-bold text-on-surface">
                          {stats.concurrency?.globalActiveSlots ?? 0}
                          <span className="text-sm font-normal text-outline"> / {stats.concurrency?.maxGlobalSlots ?? 15}</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">Capacidade total do servidor</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container flex flex-col justify-between border border-white/5">
                      <div className="flex items-center justify-between text-on-surface-variant mb-2">
                        <span className="text-xs font-semibold">Limite por Usuário</span>
                        <span className="material-symbols-outlined text-[20px] text-secondary">person_cancel</span>
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-bold text-on-surface">
                          {stats.concurrency?.maxUserSlots ?? 8}
                          <span className="text-sm font-normal text-outline"> máx</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">Downloads simultâneos (Admin 30)</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container flex flex-col justify-between border border-white/5">
                      <div className="flex items-center justify-between text-on-surface-variant mb-2">
                        <span className="text-xs font-semibold">Lock Single-Flight</span>
                        <span className="material-symbols-outlined text-[20px] text-tertiary">lock_clock</span>
                      </div>
                      <div>
                        <div className="text-2xl font-mono font-bold text-on-surface">
                          {stats.concurrency?.inFlightConversionsCount ?? 0}
                          <span className="text-sm font-normal text-outline"> ativas</span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">Deduplicação de CPU em .3MF</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-surface-container flex flex-col justify-between border border-white/5">
                      <div className="flex items-center justify-between text-on-surface-variant mb-2">
                        <span className="text-xs font-semibold">Circuit Breaker</span>
                        <span className="material-symbols-outlined text-[20px] text-error">gavel</span>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="text-2xl font-mono font-bold text-on-surface">
                            {stats.concurrency?.blockedUsersCount ?? 0}
                            <span className="text-sm font-normal text-outline"> bloqueados</span>
                          </div>
                          {(stats.concurrency?.blockedUsersCount ?? 0) > 0 && (
                            <button
                              type="button"
                              onClick={handleResetCircuitBreaker}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-error/20 hover:bg-error/30 text-error border border-error/30 transition-colors cursor-pointer"
                              title="Desbloquear todos os usuários da quarentena"
                            >
                              Liberar
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-on-surface-variant mt-1">Quarentena de 15m para abusos</p>
                      </div>
                    </div>
                  </div>

                  {/* Usuários com downloads ativos no momento */}
                  {stats.concurrency && stats.concurrency.activeUsers && stats.concurrency.activeUsers.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-surface-container border border-primary/20 flex flex-col gap-2">
                      <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                        Usuários com Downloads Ativos em Andamento
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {stats.concurrency.activeUsers.map((u) => (
                          <span
                            key={u.userId}
                            className="px-2.5 py-1 rounded bg-surface-container-high border border-white/10 text-xs font-mono text-on-surface flex items-center gap-2"
                          >
                            <span>ID: {u.userId.slice(0, 8)}...</span>
                            <span className="font-bold text-primary bg-primary/20 px-1.5 py-0.2 rounded">
                              {u.activeSlots} {u.activeSlots === 1 ? "slot" : "slots"}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tabela de Observabilidade de Downloads Recentes */}
                  {stats.downloadLogs && stats.downloadLogs.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant">
                        <span>Histórico de Requisições de Download & Conversão</span>
                        <span className="font-mono text-[11px] text-outline">Últimos {stats.downloadLogs.length} eventos</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-white/5">
                        <table className="w-full text-left text-xs font-sans">
                          <thead className="bg-surface-container text-on-surface-variant font-mono text-[11px] uppercase border-b border-white/5">
                            <tr>
                              <th className="px-3 py-2">Data/Hora</th>
                              <th className="px-3 py-2">Usuário</th>
                              <th className="px-3 py-2">Arquivo</th>
                              <th className="px-3 py-2">Status</th>
                              <th className="px-3 py-2">Resultado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 bg-surface-container-lowest/50">
                            {stats.downloadLogs.map((log) => (
                              <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-3 py-2 font-mono text-outline text-[11px]">
                                  {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })}
                                </td>
                                <td className="px-3 py-2 font-mono text-on-surface-variant">
                                  {log.userEmail || (log.userId ? log.userId.slice(0, 8) + "..." : "anônimo")}
                                </td>
                                <td className="px-3 py-2 text-on-surface truncate max-w-xs" title={log.filePath}>
                                  {log.filePath || "Arquivo 3D"}
                                </td>
                                <td className="px-3 py-2 font-mono">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                      log.statusCode === 200
                                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                        : log.statusCode === 429
                                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                        : "bg-error/15 text-error border border-error/30"
                                    }`}
                                  >
                                    {log.statusCode}
                                  </span>
                                </td>
                                <td className="px-3 py-2">
                                  <span className="text-[11px] text-on-surface-variant truncate block max-w-xs" title={log.message}>
                                    {log.result === "SUCCESS"
                                      ? "Download liberado"
                                      : log.message || log.result}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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

                {/* Recent Scans Section */}
                <section className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-6 rounded bg-tertiary"></div>
                      <h2 className="text-base font-bold text-on-surface tracking-tight">
                        Histórico Recente de Varreduras
                      </h2>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-on-surface-variant font-mono">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        Automática (Boot)
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        Manual
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso em Tempo Real (Visível durante a varredura ou logo após) */}
                  {scanProgress && (scanProgress.isScanning || scanProgress.phase === "COMPLETED" || scanProgress.phase === "FAILED") && (
                    <div
                      className={`p-4 sm:p-5 rounded-xl border transition-all duration-300 ${
                        scanProgress.phase === "COMPLETED"
                          ? "bg-tertiary/5 border-tertiary/30 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
                          : scanProgress.phase === "FAILED"
                          ? "bg-error/5 border-error/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
                          : "bg-surface-container-low border-primary/30 shadow-[0_0_24px_rgba(249,115,22,0.12)]"
                      }`}
                    >
                      {/* Top Header Card */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2.5 rounded-xl flex items-center justify-center ${
                              scanProgress.phase === "COMPLETED"
                                ? "bg-tertiary/15 text-tertiary border border-tertiary/30"
                                : scanProgress.phase === "FAILED"
                                ? "bg-error/15 text-error border border-error/30"
                                : "bg-primary-container/20 text-primary border border-primary-container/40"
                            }`}
                          >
                            <span
                              className={`material-symbols-outlined text-[24px] ${
                                scanProgress.isScanning ? "animate-spin" : ""
                              }`}
                            >
                              {scanProgress.phase === "COMPLETED"
                                ? "check_circle"
                                : scanProgress.phase === "FAILED"
                                ? "error"
                                : "sync"}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-on-surface">
                                {scanProgress.phase === "COMPLETED"
                                  ? "Varredura Concluída com Sucesso!"
                                  : scanProgress.phase === "FAILED"
                                  ? "Varredura Interrompida com Erro"
                                  : `Varredura em Andamento — ${scanProgress.libraryName || "Geral"}`}
                              </h3>
                              {scanProgress.trigger && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase font-mono ${
                                    scanProgress.trigger === "STARTUP"
                                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                                      : "bg-primary/15 text-primary border border-primary/30"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[12px]">
                                    {scanProgress.trigger === "STARTUP" ? "power_settings_new" : "person"}
                                  </span>
                                  {scanProgress.trigger === "STARTUP" ? "Automática (Boot)" : "Manual"}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-on-surface-variant mt-0.5 font-mono">
                              {scanProgress.phase === "DISCOVERING"
                                ? "Fase 1/2: Mapeando diretórios do disco e novos arquivos..."
                                : scanProgress.phase === "PROCESSING"
                                ? "Fase 2/2: Análise diferencial incremental e extração de metadados..."
                                : scanProgress.phase === "COMPLETED"
                                ? `Concluído em ${scanProgress.durationMs ? `${(scanProgress.durationMs / 1000).toFixed(1)}s` : "poucos segundos"}. Todos os modelos sincronizados.`
                                : scanProgress.errorMessage || "Ocorreu um erro no processo."}
                            </p>
                          </div>
                        </div>

                        {/* Percentual em Destaque */}
                        <div className="flex items-baseline gap-1.5 self-end sm:self-center font-mono">
                          <span
                            className={`text-2xl font-black ${
                              scanProgress.phase === "COMPLETED"
                                ? "text-tertiary"
                                : scanProgress.phase === "FAILED"
                                ? "text-error"
                                : "text-primary"
                            }`}
                          >
                            {scanProgress.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Visual */}
                      <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden p-0.5 border border-white/5 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ease-out ${
                            scanProgress.phase === "COMPLETED"
                              ? "bg-gradient-to-r from-tertiary via-emerald-400 to-tertiary"
                              : scanProgress.phase === "FAILED"
                              ? "bg-error"
                              : "bg-gradient-to-r from-primary via-orange-400 to-amber-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                          }`}
                          style={{ width: `${Math.max(4, Math.min(100, scanProgress.percentage))}%` }}
                        ></div>
                      </div>

                      {/* Linha de Detalhes Inferior */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/5 text-[11px] font-mono">
                        <div className="flex items-center gap-1.5 text-on-surface-variant truncate max-w-md">
                          <span className="material-symbols-outlined text-[14px] text-outline shrink-0">
                            {scanProgress.isScanning ? "folder_open" : "task_alt"}
                          </span>
                          <span className="truncate">
                            {scanProgress.currentModel
                              ? `Modelo: ${scanProgress.currentModel}`
                              : scanProgress.currentFolder || (scanProgress.isScanning ? "Analisando..." : "Varredura pronta")}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 flex-wrap">
                          <span className="text-on-surface-variant">
                            Pastas: <strong className="text-on-surface">{scanProgress.processedFolders}</strong>
                          </span>
                          {scanProgress.totalModels > 0 && (
                            <span className="text-on-surface-variant">
                              Modelos: <strong className="text-on-surface">{scanProgress.processedModels}/{scanProgress.totalModels}</strong>
                            </span>
                          )}
                          <span className="text-tertiary font-bold">
                            +{scanProgress.addedCount} novos
                          </span>
                          <span className="text-blue-400 font-bold">
                            ~{scanProgress.updatedCount} alterados
                          </span>
                          <span className="text-outline">
                            ={scanProgress.unchangedCount} inalterados
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tabela do Histórico */}
                  <div className="w-full overflow-x-auto rounded-xl bg-surface-container-low border border-white/5 shadow-sm">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-[11px] font-mono uppercase tracking-wider text-outline bg-surface-container-lowest">
                          <th className="py-3 px-4">Origem / Tipo</th>
                          <th className="py-3 px-4">Biblioteca</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Pastas</th>
                          <th className="py-3 px-4">Alterações</th>
                          <th className="py-3 px-4">Iniciado Em</th>
                          <th className="py-3 px-4">Duração</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono">
                        {stats.recentScans.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-on-surface-variant">
                              Nenhuma varredura registrada ainda.
                            </td>
                          </tr>
                        ) : (
                          stats.recentScans.map((scan) => (
                            <tr
                              key={scan.id}
                              className="hover:bg-surface-container-high transition-colors text-on-surface"
                            >
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide uppercase ${
                                    scan.trigger === "STARTUP"
                                      ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
                                      : "bg-primary/15 text-primary border border-primary/25"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[13px]">
                                    {scan.trigger === "STARTUP" ? "power_settings_new" : "person"}
                                  </span>
                                  {scan.trigger === "STARTUP" ? "Automática (Boot)" : "Manual"}
                                </span>
                              </td>
                              <td className="py-3 px-4 font-semibold text-primary">
                                {scan.library?.name || "Geral"}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    scan.status === "COMPLETED"
                                      ? "bg-tertiary/15 text-tertiary"
                                      : scan.status === "RUNNING"
                                      ? "bg-primary-container/15 text-primary-container"
                                      : "bg-error/15 text-error"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[12px]">
                                    {scan.status === "COMPLETED"
                                      ? "check_circle"
                                      : scan.status === "RUNNING"
                                      ? "sync"
                                      : "error"}
                                  </span>
                                  {scan.status === "COMPLETED"
                                    ? "Concluído"
                                    : scan.status === "RUNNING"
                                    ? "Em Andamento"
                                    : "Falha"}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-on-surface-variant">
                                {scan.scannedCount}
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {scan.addedCount > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-tertiary/10 text-tertiary font-bold text-[10px]">
                                      +{scan.addedCount} novos
                                    </span>
                                  )}
                                  {(scan.updatedCount ?? 0) > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 font-bold text-[10px]">
                                      ~{scan.updatedCount} modif.
                                    </span>
                                  )}
                                  {(scan.deletedCount ?? 0) > 0 && (
                                    <span className="px-1.5 py-0.5 rounded bg-error/10 text-error font-bold text-[10px]">
                                      -{scan.deletedCount} remov.
                                    </span>
                                  )}
                                  {scan.addedCount === 0 &&
                                    (scan.updatedCount ?? 0) === 0 &&
                                    (scan.deletedCount ?? 0) === 0 && (
                                      <span className="text-outline text-[11px]">Sem alterações</span>
                                    )}
                                </div>
                              </td>
                              <td className="py-3 px-4 text-outline text-[11px]">
                                {new Date(scan.startedAt).toLocaleString("pt-BR")}
                              </td>
                              <td className="py-3 px-4 text-on-surface-variant text-[11px]">
                                {formatDuration(scan.startedAt, scan.completedAt)}
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

          {/* Modal de Confirmação para Restauração de Backup */}
          <ConfirmDialog
            isOpen={!!backupToRestore}
            title="Restaurar Banco de Dados"
            message={
              <div className="space-y-2 text-xs">
                <p>
                  Você está prestes a sincronizar e restaurar o banco de dados a partir do instantâneo:
                </p>
                <div className="p-2.5 rounded-lg bg-surface-container font-mono text-[11px] text-indigo-300 break-all border border-white/5">
                  {backupToRestore?.fileName}
                </div>
                <p className="text-amber-400">
                  Atenção: Os registros atuais serão sincronizados com as tabelas do instantâneo. Deseja prosseguir?
                </p>
              </div>
            }
            confirmLabel="Sim, Restaurar Banco"
            variant="warning"
            loading={restoringBackup}
            onConfirm={handleConfirmRestore}
            onCancel={() => setBackupToRestore(null)}
          />

          {/* Modal de Confirmação para Exclusão de Backup */}
          <ConfirmDialog
            isOpen={!!backupToDelete}
            title="Excluir Arquivo de Backup"
            message={`Tem certeza que deseja excluir permanentemente o arquivo de backup "${backupToDelete?.fileName}" do disco?`}
            confirmLabel="Excluir Arquivo"
            variant="danger"
            loading={deletingBackup}
            onConfirm={handleConfirmDelete}
            onCancel={() => setBackupToDelete(null)}
          />
        </main>
      </div>
    </div>
  );
}
