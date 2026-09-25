"use client";

import React from "react";
import { useUpdate } from "@/lib/update/UpdateContext";
import { Sparkles, ArrowRight, X, ArrowUpRight } from "lucide-react";

export default function UpdateBanner() {
  const { hasUpdate, updateInfo, isBannerDismissed, openModal, dismissBanner } = useUpdate();

  if (!hasUpdate || isBannerDismissed || !updateInfo) return null;

  return (
    <div
      aria-label="Aviso de nova versão disponível"
      className="fixed bottom-6 right-6 z-40 max-w-md w-[calc(100vw-3rem)] sm:w-96 bg-surface-container-high/95 backdrop-blur-xl border border-primary-container/40 rounded-2xl shadow-2xl p-4 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-primary-container/20 border border-primary-container/40 text-primary flex-shrink-0 mt-0.5 shadow-[0_0_12px_rgba(249,115,22,0.25)]">
          <Sparkles className="w-5 h-5 text-primary animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span>Nova Versão Disponível</span>
              <span className="font-mono text-[10px] font-bold text-primary bg-primary-container/20 border border-primary-container/40 px-1.5 py-0.2 rounded">
                {updateInfo.latestVersion}
              </span>
            </h4>
            <button
              type="button"
              onClick={dismissBanner}
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors"
              title="Dispensar notificação"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-on-surface-variant leading-relaxed line-clamp-2 mb-3">
            O Martins3DVault foi atualizado no GitHub. Confira as novidades e melhorias disponíveis para o seu vault.
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_10px_rgba(249,115,22,0.3)] active:scale-95"
            >
              <span>Ver Novidades</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {updateInfo.releaseUrl && (
              <a
                href={updateInfo.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/5 text-xs font-medium transition-colors"
              >
                <span>GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
