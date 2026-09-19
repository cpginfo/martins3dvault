"use client";

import React from "react";

export type ViewMode = "large" | "compact" | "table";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  printedFilter: "all" | "unprinted" | "printed";
  onPrintedFilterChange: (filter: "all" | "unprinted" | "printed") => void;
  selectedFormat: string;
  onFormatSelect: (fmt: string) => void;
  favoritesOnly: boolean;
  onToggleFavorites: () => void;
  sort: string;
  onSortChange: (sort: string) => void;
  totalCount: number;
  collections?: Array<{ id: string; name: string }>;
  selectedCollection?: string;
  onCollectionSelect?: (colId: string) => void;
  zoomSize?: number;
  onZoomChange?: (size: number) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  selectedPolymer?: string;
  onPolymerSelect?: (polymer: string) => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  printedFilter,
  onPrintedFilterChange,
  selectedFormat,
  onFormatSelect,
  favoritesOnly,
  onToggleFavorites,
  sort,
  onSortChange,
  totalCount,
  collections = [],
  selectedCollection = "",
  onCollectionSelect,
  zoomSize = 280,
  onZoomChange,
  viewMode = "large",
  onViewModeChange,
  selectedPolymer = "",
  onPolymerSelect,
}: FilterBarProps) {
  const formats = [
    { label: "TODOS", value: "" },
    { label: ".3MF", value: "3MF", color: "text-secondary" },
    { label: ".STL", value: "STL", color: "text-primary" },
    { label: ".STEP", value: "STEP", color: "text-on-surface-variant" },
    { label: ".OBJ", value: "OBJ", color: "text-on-surface-variant" },
    { label: ".GCODE", value: "GCODE", color: "text-tertiary" },
  ];

  const polymers = [
    { label: "ABS / ASA", value: "ABS", color: "bg-primary-container" },
    { label: "PETG", value: "PETG", color: "bg-secondary" },
    { label: "TPU Flex", value: "TPU", color: "bg-tertiary" },
    { label: "PLA / Silk", value: "PLA", color: "bg-amber-400" },
    { label: "Nylon / PC", value: "PC", color: "bg-indigo-400" },
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-surface-container-low rounded-xl shadow-md border border-white/5">
      {/* Row 1: Layout Modifiers, Zoom, Search Metrics & Sorter */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Layout Modes Switcher (Grid Grande, Grid Compacto, Tabela) */}
        <div className="flex items-center gap-1 bg-surface-container-lowest p-1 rounded-lg border border-white/5">
          <button
            type="button"
            onClick={() => onViewModeChange && onViewModeChange("large")}
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${
              viewMode === "large"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
            title="Grid Grande"
          >
            <span className="material-symbols-outlined text-[18px]">grid_view</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange && onViewModeChange("compact")}
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${
              viewMode === "compact"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
            title="Grid Compacto"
          >
            <span className="material-symbols-outlined text-[18px]">view_module</span>
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange && onViewModeChange("table")}
            className={`p-1.5 rounded flex items-center justify-center transition-colors ${
              viewMode === "table"
                ? "bg-surface-container-high text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            }`}
            title="Tabela Detalhada"
          >
            <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
          </button>
        </div>

        {/* Thumbnail Zoom Slider (Eagle Style) */}
        {viewMode !== "table" && onZoomChange && (
          <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest px-3 py-1.5 rounded-lg border border-white/5">
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              photo_size_select_small
            </span>
            <input
              type="range"
              min="180"
              max="400"
              step="10"
              value={zoomSize}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="w-24 h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary-container"
              title={`Zoom: ${zoomSize}px`}
            />
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              photo_size_select_large
            </span>
            <span className="text-[11px] text-outline font-mono ml-1">{zoomSize}px</span>
          </div>
        )}

        {/* Print Status Segmented Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container-lowest border border-white/5 overflow-x-auto">
          <button
            type="button"
            onClick={() => onPrintedFilterChange("all")}
            className={`px-3 py-1 rounded text-xs font-medium transition-all ${
              printedFilter === "all"
                ? "bg-surface-container-high text-on-surface font-semibold shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onPrintedFilterChange("unprinted")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              printedFilter === "unprinted"
                ? "bg-primary-container/20 text-primary font-semibold border border-primary-container/30 shadow-sm"
                : "text-on-surface-variant hover:text-primary"
            }`}
            title="Modelos nunca impressos"
          >
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span>Nunca Impressos</span>
          </button>
          <button
            type="button"
            onClick={() => onPrintedFilterChange("printed")}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium transition-all ${
              printedFilter === "printed"
                ? "bg-tertiary/20 text-tertiary font-semibold border border-tertiary/30 shadow-sm"
                : "text-on-surface-variant hover:text-tertiary"
            }`}
            title="Modelos já impressos com sucesso"
          >
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            <span>Já Impressos</span>
          </button>
        </div>

        {/* Favorites Filter */}
        <button
          type="button"
          onClick={onToggleFavorites}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
            favoritesOnly
              ? "bg-amber-500/20 text-amber-300 border-amber-500/30 shadow-sm"
              : "bg-surface-container-lowest text-on-surface-variant border-white/5 hover:text-on-surface hover:bg-surface-container-high"
          }`}
          title="Exibir apenas favoritos"
        >
          <span
            className="material-symbols-outlined text-[16px]"
            style={{ fontVariationSettings: favoritesOnly ? "'FILL' 1" : "'FILL' 0" }}
          >
            star
          </span>
          <span>Favoritos</span>
        </button>

        {/* Sorter Dropdown */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[11px] font-mono text-outline uppercase tracking-wider hidden md:inline">
            Ordem:
          </span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-surface-container-lowest text-on-surface text-xs font-medium px-3 py-1.5 rounded-lg border border-white/5 focus:outline-none focus:border-primary-container cursor-pointer"
          >
            <option value="date_desc">Mais recentes primeiro</option>
            <option value="date_asc">Mais antigos primeiro</option>
            <option value="name_asc">Nome (A - Z)</option>
            <option value="name_desc">Nome (Z - A)</option>
            <option value="files_desc">Mais arquivos</option>
          </select>
        </div>
      </div>

      {/* Row 2: Deep Tag Filters (Formats & Filaments) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5">
        {/* Format Tags */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono text-outline uppercase tracking-wider mr-1">
            Extensões:
          </span>
          {formats.map((fmt) => {
            const isSelected = selectedFormat === fmt.value;
            return (
              <button
                key={fmt.label}
                type="button"
                onClick={() => onFormatSelect(fmt.value)}
                className={`px-2.5 py-0.5 rounded text-xs font-mono transition-all flex items-center gap-1 ${
                  isSelected
                    ? "bg-primary-container/25 text-primary border border-primary-container/40 font-semibold"
                    : "bg-surface-container-lowest text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface border border-white/5"
                }`}
              >
                <span>{fmt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Polymer Filament Badges */}
        {onPolymerSelect && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-mono text-outline uppercase tracking-wider mr-1">
              Polímero:
            </span>
            {polymers.map((poly) => {
              const isSelected = selectedPolymer === poly.value;
              return (
                <button
                  key={poly.value}
                  type="button"
                  onClick={() => onPolymerSelect(isSelected ? "" : poly.value)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-surface-container-highest text-on-surface border-primary-container/50 shadow-sm"
                      : "bg-surface-container-lowest text-on-surface-variant border-white/5 hover:bg-surface-container-highest hover:text-on-surface"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${poly.color}`}></span>
                  <span>{poly.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
