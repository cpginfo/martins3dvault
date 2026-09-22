"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import UploadModal from "@/components/upload/UploadModal";
import ThemeToggle from "@/components/theme/ThemeToggle";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onScanTriggered?: () => void;
  selectedFormat?: string;
  onFormatChange?: (format: string) => void;
  isSidebarCollapsed?: boolean;
}

export default function Navbar({
  searchQuery,
  onSearchChange,
  onScanTriggered,
  selectedFormat,
  onFormatChange,
  isSidebarCollapsed = false,
}: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isControlled = searchQuery !== undefined;
  const [internalSearch, setInternalSearch] = useState(searchQuery || "");
  const search = isControlled ? searchQuery : internalSearch;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!isControlled) setInternalSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  const handleClearSearch = () => {
    if (!isControlled) setInternalSearch("");
    if (onSearchChange) onSearchChange("");
    searchInputRef.current?.focus();
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathname !== "/") {
      router.push(`/?q=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleGlobalScan = async () => {
    setScanning(true);
    try {
      const libRes = await fetch("/api/libraries");
      if (libRes.ok) {
        const libs = await libRes.json();
        for (const lib of libs) {
          await fetch(`/api/libraries/${lib.id}/scan`, { method: "POST" });
        }
      }
      if (onScanTriggered) onScanTriggered();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("refreshCollections"));
      }
    } catch (err) {
      console.error("Erro ao disparar varredura:", err);
    } finally {
      setTimeout(() => setScanning(false), 2000);
    }
  };

  return (
    <>
      <header
        className={`fixed top-0 right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.3)] border-b border-white/5 z-40 flex items-center justify-between px-6 transition-all duration-300 ${
          isSidebarCollapsed ? "left-20" : "left-72"
        }`}
      >
        {/* Search Input & Format Filter Group */}
        <div className="flex items-center gap-3 flex-1 max-w-2xl">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant text-[18px]">
              search
            </span>
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Pesquisar arquivos STL, 3MF, STEP, G-Code... (ex: Voron, Ender, Benchy)"
              className="w-full bg-surface-container-low pl-9 pr-14 py-1.5 text-xs text-on-surface rounded-lg placeholder:text-outline border border-white/5 focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
            />
            {search ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 p-0.5 rounded text-on-surface-variant hover:text-on-surface transition-colors"
                title="Limpar pesquisa"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            ) : (
              <div className="absolute right-2.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container-highest pointer-events-none">
                <span className="text-[10px] text-on-surface-variant font-mono">⌘K</span>
              </div>
            )}
          </form>

          {/* Quick Format Pills */}
          {onFormatChange && (
            <div className="hidden xl:flex items-center gap-1">
              <button
                type="button"
                onClick={() => onFormatChange("")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  !selectedFormat
                    ? "bg-surface-container-highest text-on-surface font-semibold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => onFormatChange(selectedFormat === "STL" ? "" : "STL")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  selectedFormat === "STL"
                    ? "bg-primary-container/25 text-primary border border-primary-container/40 font-semibold"
                    : "bg-surface-container-low text-primary-container hover:bg-surface-container-high"
                }`}
              >
                .STL
              </button>
              <button
                type="button"
                onClick={() => onFormatChange(selectedFormat === "3MF" ? "" : "3MF")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  selectedFormat === "3MF"
                    ? "bg-secondary/25 text-secondary border border-secondary/40 font-semibold"
                    : "bg-surface-container-low text-secondary hover:bg-surface-container-high"
                }`}
              >
                .3MF
              </button>
              <button
                type="button"
                onClick={() => onFormatChange(selectedFormat === "GCODE" ? "" : "GCODE")}
                className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                  selectedFormat === "GCODE"
                    ? "bg-tertiary/25 text-tertiary border border-tertiary/40 font-semibold"
                    : "bg-surface-container-low text-tertiary hover:bg-surface-container-high"
                }`}
              >
                G-Code
              </button>
            </div>
          )}
        </div>

        {/* Right Actions: Scan Button, Upload, Notifications */}
        <div className="flex items-center gap-3">

          <button
            onClick={handleGlobalScan}
            disabled={scanning}
            className="flex items-center gap-1.5 bg-primary-container text-on-primary font-medium text-xs px-3.5 py-1.5 rounded-lg hover:bg-primary transition-all shadow-[0_0_12px_rgba(249,115,22,0.3)] active:scale-[0.98]"
            title="Escanear e indexar arquivos agora"
          >
            <span
              className={`material-symbols-outlined text-[18px] ${
                scanning ? "animate-spin" : ""
              }`}
            >
              sync
            </span>
            <span className="font-semibold">{scanning ? "Escaneando..." : "Escanear Agora"}</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors text-xs font-medium border border-white/5"
            title="Adicionar novo modelo ou ZIP"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">
              cloud_upload
            </span>
            <span className="hidden sm:inline">Upload</span>
          </button>

          <button
            className="relative p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Notificações do sistema"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-container"></span>
          </button>

          <ThemeToggle />

          <Link
            href="/libraries"
            className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            title="Configurações de pastas e bibliotecas"
          >
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>

        </div>
      </header>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={() => {
          if (onScanTriggered) onScanTriggered();
        }}
      />
    </>
  );
}
