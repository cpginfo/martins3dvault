"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Heart,
  HeartOff,
  FolderInput,
  Trash2,
  X,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/ToastContext";

interface BatchActionBarProps {
  selectedIds: string[];
  totalVisible: number;
  collections: Array<{ id: string; name: string }>;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onCloseBatchMode: () => void;
  onSuccess: () => void;
}

export default function BatchActionBar({
  selectedIds,
  totalVisible,
  collections,
  onSelectAll,
  onClearSelection,
  onCloseBatchMode,
  onSuccess,
}: BatchActionBarProps) {
  const toast = useToast();
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetCollectionId, setTargetCollectionId] = useState<string>("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const selectedCount = selectedIds.length;
  const isAllSelected = selectedCount > 0 && selectedCount === totalVisible;

  const executeBatchAction = async (action: string, payload: Record<string, any> = {}) => {
    if (selectedCount === 0) return;
    setLoadingAction(action);
    try {
      const res = await fetch("/api/models/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          modelIds: selectedIds,
          ...payload,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Falha na operação em lote");
      }

      const resData = await res.json().catch(() => null);
      toast.success(resData?.message || `${selectedCount} modelos processados com sucesso!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erro ao processar ação em lote");
    } finally {
      setLoadingAction(null);
      setShowMoveModal(false);
      setConfirmDelete(false);
    }
  };

  if (selectedCount === 0) {
    return (
      <aside
        aria-label="Barra de ações em lote"
        className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-surface-container-high/95 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 sm:gap-4 text-xs font-medium text-on-surface max-w-[92vw]"
      >
        <span className="flex items-center gap-1.5 text-on-surface-variant font-mono">
          <CheckSquare className="w-4 h-4 text-primary" />
          <span className="hidden sm:inline">Modo de Seleção Ativo</span>
        </span>
        <button
          type="button"
          onClick={onSelectAll}
          className="text-primary hover:underline cursor-pointer font-semibold"
        >
          Selecionar todos ({totalVisible})
        </button>
        <div className="w-[1px] h-4 bg-white/10"></div>
        <button
          type="button"
          onClick={onCloseBatchMode}
          className="text-on-surface-variant hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </aside>
    );
  }

  return (
    <>
      <aside
        aria-label="Barra de ações em lote"
        className="fixed bottom-3 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0f141b]/95 backdrop-blur-md border border-primary/30 px-3 sm:px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-1.5 sm:gap-2 text-xs font-medium text-white ring-1 ring-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[96vw] overflow-x-auto no-scrollbar"
      >
        {/* Contador */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-white/10 shrink-0">
          <span className="px-2 py-0.5 rounded-full bg-primary-container text-on-primary-container font-mono font-bold text-[11px]">
            {selectedCount}
          </span>
          <span className="hidden sm:inline text-slate-300">itens</span>
        </div>

        {/* Selecionar Todos / Desmarcar */}
        <button
          type="button"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 transition cursor-pointer shrink-0"
          title={isAllSelected ? "Desmarcar todos" : "Selecionar todos da página"}
        >
          {isAllSelected ? (
            <>
              <Square className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden md:inline">Desmarcar</span>
            </>
          ) : (
            <>
              <CheckSquare className="w-3.5 h-3.5 text-primary" />
              <span className="hidden md:inline">Todos ({totalVisible})</span>
            </>
          )}
        </button>

        <div className="w-[1px] h-4 bg-white/10 hidden sm:block shrink-0"></div>

        {/* Ações de Impressão */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => executeBatchAction("set_printed", { value: true })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 transition cursor-pointer disabled:opacity-50"
            title="Marcar como impresso"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden lg:inline">Impresso</span>
          </button>
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => executeBatchAction("set_printed", { value: false })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Marcar como não impresso"
          >
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline">Não Impresso</span>
          </button>
        </div>

        {/* Ações de Favoritos */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => executeBatchAction("set_favorite", { value: true })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition cursor-pointer disabled:opacity-50"
            title="Favoritar modelos selecionados"
          >
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Favoritar</span>
          </button>
          <button
            type="button"
            disabled={Boolean(loadingAction)}
            onClick={() => executeBatchAction("set_favorite", { value: false })}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/60 border border-white/10 text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Remover dos favoritos"
          >
            <HeartOff className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline">Desfavoritar</span>
          </button>
        </div>

        {/* Ação: Mover para Coleção */}
        <button
          type="button"
          disabled={Boolean(loadingAction)}
          onClick={() => setShowMoveModal(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 transition cursor-pointer disabled:opacity-50 shrink-0"
          title="Mover modelos selecionados para uma coleção"
        >
          <FolderInput className="w-3.5 h-3.5 text-indigo-400" />
          <span>Mover</span>
        </button>

        {/* Ação: Excluir */}
        <button
          type="button"
          disabled={Boolean(loadingAction)}
          onClick={() => setConfirmDelete(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-300 transition cursor-pointer disabled:opacity-50 shrink-0"
          title="Excluir modelos selecionados"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-400" />
          <span className="hidden sm:inline">Excluir</span>
        </button>

        {/* Fechar Modo de Seleção */}
        <button
          type="button"
          onClick={onCloseBatchMode}
          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition ml-1 cursor-pointer shrink-0"
          title="Cancelar seleção e fechar barra"
        >
          <X className="w-4 h-4" />
        </button>

        {loadingAction && (
          <div className="flex items-center gap-1.5 pl-2 text-primary font-mono text-[11px] shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span className="hidden md:inline">Processando...</span>
          </div>
        )}
      </aside>

      {/* Modal de Mover Coleção */}
      {showMoveModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121822] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <FolderInput className="w-5 h-5 text-indigo-400" />
              <span>Mover {selectedCount} Modelo(s)</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Selecione a coleção de destino para onde os modelos marcados serão transferidos:
            </p>

            <select
              value={targetCollectionId}
              onChange={(e) => setTargetCollectionId(e.target.value)}
              className="w-full bg-[#182330] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">(Sem coleção / Raiz da biblioteca)</option>
              {collections.map((col) => (
                <option key={col.id} value={col.id}>
                  📁 {col.name}
                </option>
              ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowMoveModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() =>
                  executeBatchAction("move_collection", {
                    collectionId: targetCollectionId || null,
                  })
                }
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg transition"
              >
                Confirmar e Mover
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#181114] border border-red-500/20 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-semibold text-red-300 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              <span>Excluir {selectedCount} Modelo(s)?</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Você está prestes a remover <strong className="text-white">{selectedCount} modelos</strong> do banco de dados do Martins3DVault.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeBatchAction("delete")}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-lg transition"
              >
                Sim, Excluir em Lote
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
