"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { VersionCheckResult } from "@/lib/version-checker";
import { APP_VERSION } from "@/lib/version";

interface UpdateContextType {
  updateInfo: VersionCheckResult | null;
  hasUpdate: boolean;
  checking: boolean;
  checkUpdates: (force?: boolean) => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  isBannerDismissed: boolean;
  dismissBanner: () => void;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const [updateInfo, setUpdateInfo] = useState<VersionCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);

  const checkUpdates = useCallback(async (force = false) => {
    try {
      setChecking(true);
      const url = force
        ? `/api/version/check?force=true&_t=${Date.now()}`
        : `/api/version/check?_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });
      if (res.ok) {
        const data: VersionCheckResult = await res.json();
        setUpdateInfo(data);

        // Verifica se usuário já dispensou o banner desta versão específica
        if (typeof window !== "undefined" && data.latestVersion) {
          const dismissedVersion = localStorage.getItem("pv_dismissed_update_version");
          if (dismissedVersion === data.latestVersion) {
            setIsBannerDismissed(true);
          } else {
            setIsBannerDismissed(false);
          }
        }
      }
    } catch (err) {
      console.warn("Falha ao checar atualizações:", err);
    } finally {
      setChecking(false);
    }
  }, []);

  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);

  const dismissBanner = useCallback(() => {
    setIsBannerDismissed(true);
    if (typeof window !== "undefined" && updateInfo?.latestVersion) {
      localStorage.setItem("pv_dismissed_update_version", updateInfo.latestVersion);
    }
  }, [updateInfo?.latestVersion]);

  // Checagem inicial ao carregar a página
  useEffect(() => {
    // Pequeno delay para priorizar carregamento da tela
    const timer = setTimeout(() => {
      checkUpdates(false);
    }, 1500);

    // Checagem periódica a cada 60 minutos
    const interval = setInterval(() => {
      checkUpdates(false);
    }, 60 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [checkUpdates]);

  const hasUpdate = Boolean(updateInfo?.hasUpdate);

  return (
    <UpdateContext.Provider
      value={{
        updateInfo,
        hasUpdate,
        checking,
        checkUpdates,
        isModalOpen,
        openModal,
        closeModal,
        isBannerDismissed,
        dismissBanner,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}

export function useUpdate() {
  const context = useContext(UpdateContext);
  if (!context) {
    throw new Error("useUpdate deve ser utilizado dentro de um UpdateProvider");
  }
  return context;
}
