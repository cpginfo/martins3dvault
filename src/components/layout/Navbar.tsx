"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  Box,
  FolderTree,
  BarChart3,
  Search,
  RefreshCw,
  Sparkles,
  User,
  LogOut,
  Upload,
  Users,
  X,
} from "lucide-react";
import UploadModal from "@/components/upload/UploadModal";

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onScanTriggered?: () => void;
}

export default function Navbar({ searchQuery, onSearchChange, onScanTriggered }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery || "");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; role: string } | null>(null);
  const [appVersion, setAppVersion] = useState<string>(
    process.env.NEXT_PUBLIC_APP_VERSION || "v1.2.0"
  );

  useEffect(() => {
    if (searchQuery !== undefined) {
      setSearch(searchQuery);
    }
  }, [searchQuery]);

  // Global Keyboard Shortcut: ⌘K or Ctrl+K to focus search
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

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.authenticated) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    fetch("/api/health")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.version) {
          setAppVersion(data.version);
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (onSearchChange) onSearchChange(val);
  };

  const handleClearSearch = () => {
    setSearch("");
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
      // Pega a primeira biblioteca para varredura rápida
      const res = await fetch("/api/libraries");
      if (res.ok) {
        const libs = await res.json();
        if (libs.length > 0) {
          await fetch(`/api/libraries/${libs[0].id}/scan`, { method: "POST" });
          if (onScanTriggered) onScanTriggered();
        }
      }
    } catch (err) {
      console.error("Erro ao disparar varredura:", err);
    } finally {
      setScanning(false);
    }
  };

  const navLinks = [
    { name: "Galeria", href: "/", icon: Box },
    { name: "Coleções", href: "/collections", icon: Layers },
    { name: "Bibliotecas", href: "/libraries", icon: FolderTree },
    { name: "Usuários", href: "/users", icon: Users },
    { name: "Métricas", href: "/metrics", icon: BarChart3 },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#090b12]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-4">
          {/* Brand Logo */}
          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition-all">
                <div className="w-full h-full bg-[#0d101d] rounded-[11px] flex items-center justify-center">
                  <Box className="w-5 h-5 text-indigo-400 group-hover:text-cyan-300 transition-colors" />
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-white text-base">Martins3DVault</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hidden sm:inline">
                    3D
                  </span>
                  <span
                    className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10"
                    title="Versão do Aplicativo"
                  >
                    {appVersion}
                  </span>
                </div>
              </div>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Global Search Input (Linear-style, persistent and shortcut-enabled) */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-sm lg:max-w-md hidden sm:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={handleSearch}
                placeholder="Buscar modelos (.stl, .3mf, tags)..."
                className="w-full pl-9 pr-14 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-all"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {search && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
                <span className="text-[10px] font-mono text-slate-500 border border-white/10 px-1.5 py-0.5 rounded bg-white/5 pointer-events-none">
                  ⌘K
                </span>
              </div>
            </div>
          </form>

          {/* Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Upload Button */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload</span>
            </button>

            {/* Quick Scan Button */}
            <button
              onClick={handleGlobalScan}
              disabled={scanning}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin text-indigo-400" : ""}`} />
              <span className="hidden sm:inline">{scanning ? "Escaneando..." : "Escanear"}</span>
            </button>

            {/* User Profile / Status */}
            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow">
                  {currentUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-medium text-slate-200">{currentUser.name}</span>
                  <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-semibold">
                    {currentUser.role}
                  </span>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
              >
                <User className="w-4 h-4" />
                <span>Entrar</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Global Upload Modal */}
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
