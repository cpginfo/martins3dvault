"use client";

import React, { useState } from "react";
import { useUpdate } from "@/lib/update/UpdateContext";
import {
  Sparkles,
  X,
  ExternalLink,
  Copy,
  Check,
  ArrowRight,
  Terminal,
  Calendar,
  AlertCircle,
} from "lucide-react";

export default function UpdateModal() {
  const { isModalOpen, closeModal, updateInfo } = useUpdate();
  const [copied, setCopied] = useState(false);

  if (!isModalOpen || !updateInfo) return null;

  const dockerCommand = "docker compose pull && docker compose up -d";

  const handleCopy = () => {
    if (typeof navigator !== "undefined") {
      navigator.clipboard.writeText(dockerCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = updateInfo.publishedAt
    ? new Date(updateInfo.publishedAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md transition-all animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeModal();
      }}
    >
      <div className="relative w-full max-w-xl bg-surface-container-high border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header com gradiente */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-primary-container/20 via-primary-container/10 to-transparent border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-container/20 border border-primary-container/40 text-primary flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.25)]">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                Nova Versão Disponível
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary-container/30 text-primary border border-primary-container/50">
                  GitHub Release
                </span>
              </h3>
              <p className="text-xs text-on-surface-variant">
                Uma atualização do Martins3DVault foi detectada no repositório.
              </p>
            </div>
          </div>

          <button
            onClick={closeModal}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Version Diff Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-surface-container-low border border-white/5">
            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-outline tracking-wider block">
                  Instalada
                </span>
                <span className="font-mono text-xs font-semibold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded">
                  {updateInfo.currentVersion}
                </span>
              </div>

              <ArrowRight className="w-4 h-4 text-outline" />

              <div className="text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold text-primary tracking-wider block">
                  Disponível
                </span>
                <span className="font-mono text-sm font-bold text-primary bg-primary-container/20 border border-primary-container/40 px-2.5 py-0.5 rounded shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                  {updateInfo.latestVersion || "vNovo"}
                </span>
              </div>
            </div>

            {formattedDate && (
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant self-end sm:self-center font-mono">
                <Calendar className="w-3.5 h-3.5 text-outline" />
                <span>{formattedDate}</span>
              </div>
            )}
          </div>

          {/* Release Notes */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
              <span>Notas da Versão ({updateInfo.releaseName || updateInfo.latestVersion})</span>
            </h4>
            <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-white/5 text-xs text-on-surface-variant font-sans max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap select-text">
              {updateInfo.releaseNotes?.trim() ? (
                updateInfo.releaseNotes
              ) : (
                <span className="italic text-outline">
                  Consulte a página oficial de releases do GitHub para visualizar os detalhes completos do changelog.
                </span>
              )}
            </div>
          </div>

          {/* Instruções de Atualização via Docker */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-primary" />
              <span>Instruções para Atualizar (Docker)</span>
            </h4>
            <div className="relative group p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-emerald-400 flex items-center justify-between">
              <span className="overflow-x-auto select-all">{dockerCommand}</span>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-on-surface text-[11px] font-sans font-medium transition-colors"
                title="Copiar comando"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-on-surface-variant" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-outline mt-1.5 leading-normal">
              Execute o comando acima no diretório do seu <code>docker-compose.yaml</code> para baixar a nova imagem e reiniciar o contêiner sem perda de dados.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-surface-container-low border-t border-white/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors"
          >
            Fechar
          </button>

          {updateInfo.releaseUrl && (
            <a
              href={updateInfo.releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-container text-on-primary text-xs font-semibold hover:bg-primary transition-all shadow-[0_0_12px_rgba(249,115,22,0.3)] active:scale-95"
            >
              <span>Ver Release no GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
