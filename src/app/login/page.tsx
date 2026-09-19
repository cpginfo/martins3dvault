"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Falha na autenticação do cofre");
      }

      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillAdminCredentials = () => {
    setEmail("admin@printvault.local");
    setPassword("admin123");
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-surface-container-lowest p-6 relative overflow-hidden">
      {/* Subtle CAD Isometric Pattern & Ambient Glows from Stitch */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        <svg
          className="absolute w-full h-full opacity-10 text-on-surface"
          height="100%"
          width="100%"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern
              height="83.138"
              id="cad-grid"
              patternUnits="userSpaceOnUse"
              width="48"
            >
              <path
                d="M48 0 L24 13.856 L0 0 M24 13.856 L24 41.569 M48 41.569 L24 55.425 L0 41.569 M24 55.425 L24 83.138 M48 83.138 L24 96.994 L0 83.138"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.75"
              ></path>
              <circle cx="24" cy="13.856" fill="currentColor" opacity="0.4" r="1.5"></circle>
              <circle cx="24" cy="55.425" fill="currentColor" opacity="0.4" r="1.5"></circle>
            </pattern>
          </defs>
          <rect fill="url(#cad-grid)" height="100%" width="100%"></rect>
        </svg>
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"></div>
      </div>



      {/* Central Vault Card from Stitch */}
      <div className="relative w-full max-w-lg bg-surface-container/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-10 z-10 flex flex-col gap-6 border border-white/10">
        {/* Top Hardware Telemetry Badge Strip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 bg-surface-container-highest/60 px-3 py-1 rounded-lg border border-white/5">
            <span className="material-symbols-outlined text-secondary text-sm">lock</span>
            <span className="text-[10px] text-secondary tracking-widest uppercase font-mono font-semibold">
              ENCRYPTED REPOSITORY
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-on-surface-variant/70 text-[11px] font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-container"></span>
            <span>NODE: VLT-01</span>
          </div>
        </div>

        {/* Header Section: Logo & Identity */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-container to-secondary rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
            <div className="relative w-16 h-16 rounded-xl bg-surface-container-lowest p-2 flex items-center justify-center shadow-md border border-white/5">
              <Image
                src="/logo.png"
                alt="Martins3DVault"
                width={56}
                height={56}
                className="w-full h-full object-contain"
                priority
              />
            </div>
          </div>

          <div className="mt-1">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight flex items-center justify-center gap-1">
              <span>Martins</span>
              <span className="text-primary-container">3D</span>
              <span>Vault</span>
            </h1>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
              Gerenciador e Cofre Inteligente de Arquivos 3D (STL & 3MF)
            </p>
          </div>

          {/* Format Compatibility Pills */}
          <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
            <span className="px-2 py-0.5 rounded bg-primary-container/15 text-primary-container font-semibold border border-primary-container/20">
              .STL
            </span>
            <span className="px-2 py-0.5 rounded bg-secondary/15 text-secondary font-semibold border border-secondary/20">
              .3MF
            </span>
            <span className="px-2 py-0.5 rounded bg-surface-container-highest text-on-surface-variant border border-white/5">
              .STEP
            </span>
            <span className="px-2 py-0.5 rounded bg-tertiary/15 text-tertiary font-semibold border border-tertiary/20">
              .GCODE
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-lg bg-error-container/40 border border-error/30 text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Main Authentication Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">person</span>
                <span>Usuário ou E-mail</span>
              </label>
              <span className="font-mono text-[10px] text-on-surface-variant/60">LOCAL / ADMIN</span>
            </div>
            <div className="relative flex items-center">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@printvault.local"
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg px-3.5 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container font-mono"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                <span>Chave de Acesso / Senha</span>
              </label>
            </div>
            <div className="relative flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-surface-container-lowest border border-white/10 rounded-lg pl-3.5 pr-10 py-2.5 text-xs text-on-surface placeholder:text-outline focus:outline-none focus:border-primary-container font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 text-on-surface-variant hover:text-on-surface transition-colors"
                title={showPassword ? "Ocultar senha" : "Ver senha"}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? "visibility_off" : "visibility"}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-lg bg-primary-container text-on-primary font-bold text-xs hover:bg-primary transition-all shadow-[0_0_16px_rgba(249,115,22,0.35)] active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">key</span>
            <span>{loading ? "Desbloqueando Cofre..." : "Acessar Martins3DVault"}</span>
          </button>
        </form>

        {/* Quick Demo Fill Button */}
        <div className="pt-2 border-t border-white/5 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={fillAdminCredentials}
            className="text-[11px] font-mono text-secondary hover:text-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">auto_fix_high</span>
            <span>Preencher Credenciais Demo de Administrador</span>
          </button>
        </div>
      </div>
    </main>
  );
}
