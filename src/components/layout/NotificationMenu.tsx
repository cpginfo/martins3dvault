"use client";

import React, { useState, useRef, useEffect } from "react";
import { useUpdate } from "@/lib/update/UpdateContext";
import { APP_VERSION } from "@/lib/version";
import {
  Bell,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export default function NotificationMenu() {
  const { hasUpdate, updateInfo, checking, checkUpdates, openModal } = useUpdate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleOpenUpdate = () => {
    setIsOpen(false);
    openModal();
  };

  const formattedDate = updateInfo?.checkedAt
    ? new Date(updateInfo.checkedAt).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="relative" ref={menuRef}>
      {/* Botão do Sino de Notificações */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-lg transition-colors cursor-pointer ${
          isOpen
            ? "bg-surface-container-high text-on-surface"
            : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
        }`}
        title="Central de notificações e atualizações"
        aria-label="Abrir notificações do sistema"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>

        {/* Indicador de Atualização Disponível (com pulso) */}
        {hasUpdate ? (
          <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
          </span>
        ) : (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500/80"></span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface-container-high/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-surface-container-low/50">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                notifications
              </span>
              <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                Notificações
              </span>
            </div>

            <button
              type="button"
              onClick={() => checkUpdates(true)}
              disabled={checking}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-colors disabled:opacity-50"
              title="Consultar GitHub Releases agora"
            >
              <RefreshCw className={`w-3 h-3 ${checking ? "animate-spin text-primary" : ""}`} />
              <span>{checking ? "Verificando..." : "Checar"}</span>
            </button>
          </div>

          {/* Lista de Notificações */}
          <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
            {/* Card de Atualização se houver nova versão */}
            {hasUpdate && updateInfo && (
              <div
                onClick={handleOpenUpdate}
                className="group p-3 rounded-xl bg-gradient-to-r from-primary-container/20 to-primary-container/10 border border-primary-container/30 hover:border-primary-container/60 cursor-pointer transition-all shadow-sm"
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-primary-container/20 text-primary flex-shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-on-surface">Nova Versão</span>
                      <span className="font-mono text-[10px] font-bold text-primary bg-primary-container/30 px-1.5 py-0.2 rounded border border-primary-container/40">
                        {updateInfo.latestVersion}
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed">
                      {updateInfo.releaseName || "Atualização disponível no GitHub."}
                    </p>
                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px] text-primary font-medium">
                      <span>Clique para ver detalhes</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Status do Sistema */}
            <div className="p-3 rounded-xl bg-surface-container-lowest border border-white/5 flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 flex-shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-semibold text-on-surface">
                    {hasUpdate ? "Versão Atual Instalada" : "Sistema Atualizado"}
                  </span>
                  <span className="font-mono text-[10px] text-on-surface-variant bg-surface-container-high px-1.5 py-0.2 rounded">
                    {APP_VERSION}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  {hasUpdate
                    ? `Você está executando a versão ${APP_VERSION}. Uma versão mais recente está pronta para uso.`
                    : `Seu vault está na versão mais recente oficial do GitHub.`}
                </p>
                {formattedDate && (
                  <p className="text-[10px] text-outline mt-1 font-mono">
                    Última verificação: hoje às {formattedDate}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Footer do Menu */}
          <div className="px-4 py-2.5 bg-surface-container-low border-t border-white/10 flex items-center justify-between text-[11px] text-outline">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>GitHub CI/CD Verificado</span>
            </span>

            <a
              href={`https://github.com/${updateInfo?.repository || "cpginfo/martins3dvault"}/releases`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span>Releases</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
