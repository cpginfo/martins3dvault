"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  FolderTree,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  HardDrive,
  Box,
  Terminal,
} from "lucide-react";

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
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningId, setScanningId] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLibName, setNewLibName] = useState("");
  const [newLibPath, setNewLibPath] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
  }, []);

  const handleScan = async (id: string) => {
    setScanningId(id);
    try {
      const res = await fetch(`/api/libraries/${id}/scan`, { method: "POST" });
      if (res.ok) {
        await fetchLibraries();
      }
    } catch (err) {
      console.error("Erro ao escanear biblioteca:", err);
    } finally {
      setScanningId(null);
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
      await fetchLibraries();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090a10]">
      <Navbar onScanTriggered={fetchLibraries} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <FolderTree className="w-6 h-6 text-indigo-400" />
              <span>Diretórios & Bibliotecas</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Gerencie pontos de montagem locais, NFS ou CIFS e execute varreduras inteligentes em segundo plano.
            </p>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Biblioteca</span>
          </button>
        </div>

        {/* Add Library Modal / Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreateLibrary}
            className="mb-8 p-6 rounded-2xl glass-panel border border-indigo-500/30 shadow-2xl animate-in fade-in duration-200"
          >
            <h3 className="text-base font-bold text-white mb-4">Cadastrar Novo Diretório de Modelos</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Nome Amigável da Biblioteca
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Projetos Bambu Lab, Coleção Miniaturas"
                  value={newLibName}
                  onChange={(e) => setNewLibName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Caminho do Diretório no Servidor / Container
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: /libraries/sample_library ou ./libraries/sample_library"
                  value={newLibPath}
                  onChange={(e) => setNewLibPath(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all disabled:opacity-50"
              >
                {creating ? "Cadastrando..." : "Salvar Biblioteca"}
              </button>
            </div>
          </form>
        )}

        {/* Libraries List */}
        <div className="flex flex-col gap-4">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando bibliotecas...</div>
          ) : libraries.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-white/5 bg-white/[0.02] text-slate-400">
              Nenhuma biblioteca cadastrada. Clique em &quot;Adicionar Biblioteca&quot; acima para apontar suas pastas de arquivos 3D.
            </div>
          ) : (
            libraries.map((lib) => (
              <div
                key={lib.id}
                className="p-5 rounded-2xl glass-card flex flex-col gap-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-white">{lib.name}</h3>
                      {lib.existsOnDisk ? (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" /> Conectado ao Disco
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <AlertCircle className="w-3 h-3" /> Caminho não encontrado
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1">{lib.path}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-semibold text-white">
                        {lib.modelsCount} {lib.modelsCount === 1 ? "modelo" : "modelos"}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" />
                        <span>
                          {lib.lastScanAt
                            ? new Date(lib.lastScanAt).toLocaleString("pt-BR")
                            : "Nunca escaneado"}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleScan(lib.id)}
                      disabled={scanningId === lib.id || lib.scanStatus === "SCANNING"}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          scanningId === lib.id || lib.scanStatus === "SCANNING"
                            ? "animate-spin"
                            : ""
                        }`}
                      />
                      <span>
                        {scanningId === lib.id || lib.scanStatus === "SCANNING"
                          ? "Escaneando..."
                          : "Escanear Agora"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Job Log Preview if available */}
                {lib.lastJob && (
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] font-mono text-slate-400 flex items-start gap-2">
                    <Terminal className="w-4 h-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3 text-slate-300">
                        <span>Status: <strong className="text-indigo-300">{lib.lastJob.status}</strong></span>
                        <span>•</span>
                        <span>Novos: <strong className="text-emerald-300">{lib.lastJob.addedCount}</strong></span>
                        <span>•</span>
                        <span>Atualizados: <strong className="text-cyan-300">{lib.lastJob.updatedCount}</strong></span>
                      </div>
                      {lib.lastJob.log && (
                        <div className="text-slate-500 truncate max-w-2xl">{lib.lastJob.log}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
