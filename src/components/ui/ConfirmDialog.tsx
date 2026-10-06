"use client";

import React from "react";
import { AlertTriangle, AlertCircle, HelpCircle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "primary",
  onConfirm,
  onCancel,
  loading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-150 ${
          isDanger
            ? "bg-[#161014] border-red-500/30 text-white"
            : isWarning
            ? "bg-[#16140e] border-amber-500/30 text-white"
            : "bg-[#0f141b] border-white/10 text-white"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl flex items-center justify-center shrink-0 ${
              isDanger
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : isWarning
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-primary-container/20 text-primary-container border border-primary-container/30"
            }`}
          >
            {isDanger && <AlertCircle className="w-5 h-5" />}
            {isWarning && <AlertTriangle className="w-5 h-5" />}
            {!isDanger && !isWarning && <HelpCircle className="w-5 h-5" />}
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed">{message}</div>

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/5">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer min-h-[38px]"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 min-h-[38px] ${
              isDanger
                ? "bg-red-600 hover:bg-red-500 text-white shadow-red-900/40"
                : isWarning
                ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/40"
                : "bg-primary-container hover:bg-primary text-on-primary shadow-primary-container/30"
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
