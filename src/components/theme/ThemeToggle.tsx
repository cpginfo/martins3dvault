"use client";

import React from "react";
import { useTheme } from "@/lib/theme/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme, isLoaded } = useTheme();

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 p-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-container/40 ${
        isDark
          ? "text-on-surface-variant hover:text-amber-400 hover:bg-surface-container-high"
          : "text-slate-600 hover:text-amber-600 hover:bg-slate-200/80"
      } ${className}`}
      title={isDark ? "Alternar para Modo Claro (Light)" : "Alternar para Modo Escuro (Dark)"}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon for switching to light, Moon icon for switching to dark */}
        <span
          className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
            isDark
              ? "rotate-0 scale-100 text-amber-400"
              : "-rotate-90 scale-0 opacity-0 absolute"
          }`}
        >
          light_mode
        </span>
        <span
          className={`material-symbols-outlined text-[20px] transition-transform duration-300 ${
            !isDark
              ? "rotate-0 scale-100 text-slate-700"
              : "rotate-90 scale-0 opacity-0 absolute"
          }`}
        >
          dark_mode
        </span>
      </div>

      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? "Modo Claro" : "Modo Escuro"}
        </span>
      )}
    </button>
  );
}
