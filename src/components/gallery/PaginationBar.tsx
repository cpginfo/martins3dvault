"use client";

import React from "react";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number | "all";
  currentCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number | "all") => void;
  pageSizeOptions?: Array<number | "all">;
}

export default function PaginationBar({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  currentCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [24, 48, 96, 192, "all"],
}: PaginationBarProps) {
  if (totalCount === 0) return null;

  const startItem = pageSize === "all" ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem =
    pageSize === "all" ? totalCount : Math.min(totalCount, (currentPage - 1) * pageSize + currentCount);

  // Gera a lista de números de páginas com reticências
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 mt-6 bg-surface-container-low rounded-xl border border-white/5 shadow-md">
      {/* Informações de contagem */}
      <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
        <span className="material-symbols-outlined text-[18px] text-primary-container">
          layers
        </span>
        {pageSize === "all" ? (
          <span>
            Exibindo todos os <strong className="text-on-surface font-semibold">{totalCount}</strong> modelos
          </span>
        ) : (
          <span>
            Exibindo <strong className="text-on-surface font-semibold">{startItem}–{endItem}</strong> de{" "}
            <strong className="text-on-surface font-semibold">{totalCount}</strong> modelos
          </span>
        )}
      </div>

      {/* Controles de navegação de páginas */}
      {pageSize !== "all" && totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* Primeira página */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:pointer-events-none border border-white/5"
            title="Primeira página"
          >
            <span className="material-symbols-outlined text-[16px]">first_page</span>
          </button>

          {/* Página anterior */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:pointer-events-none border border-white/5"
            title="Página anterior"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          </button>

          {/* Números de páginas */}
          <div className="flex items-center gap-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="w-8 h-8 flex items-center justify-center text-outline text-xs select-none"
                  >
                    •••
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === currentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-mono font-medium transition-all ${
                    isActive
                      ? "bg-primary-container text-on-primary font-bold shadow-[0_0_12px_rgba(249,115,22,0.35)] scale-105"
                      : "bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border border-white/5"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Próxima página */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:pointer-events-none border border-white/5"
            title="Próxima página"
          >
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          </button>

          {/* Última página */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-30 disabled:pointer-events-none border border-white/5"
            title="Última página"
          >
            <span className="material-symbols-outlined text-[16px]">last_page</span>
          </button>
        </div>
      )}

      {/* Seletor de itens por página */}
      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <span className="hidden md:inline text-[11px] font-mono text-outline">Por página:</span>
        <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-lg border border-white/5">
          {pageSizeOptions.map((opt) => {
            const isSelected = pageSize === opt;
            return (
              <button
                key={String(opt)}
                type="button"
                onClick={() => onPageSizeChange(opt)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-all ${
                  isSelected
                    ? "bg-primary-container text-on-primary font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                {opt === "all" ? "Todos" : opt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
