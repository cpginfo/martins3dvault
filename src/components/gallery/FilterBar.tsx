"use client";

import React from "react";
import { Filter, Star, ArrowUpDown, Layers, Search, X, CheckCircle2, Clock, Printer } from "lucide-react";

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
}: FilterBarProps) {
  const formats = [
    { label: "Todos", value: "" },
    { label: "STL", value: "STL" },
    { label: "3MF", value: "3MF" },
    { label: "OBJ", value: "OBJ" },
  ];

  return (
    <div className="flex flex-col gap-3 py-4 border-b border-white/10 text-sm">
      {/* Top Row: Search Input & Print Status Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Dedicated In-Page Search Bar */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Pesquisar modelos por nome, arquivo, coleção..."
            className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/70 focus:ring-1 focus:ring-indigo-500/70 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Limpar pesquisa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Print Status Segmented Tabs ("Nunca Impressos", "Já Impressos", "Todos") */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10 self-start sm:self-auto overflow-x-auto">
          <button
            onClick={() => onPrintedFilterChange("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              printedFilter === "all"
                ? "bg-white/15 text-white shadow-sm"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => onPrintedFilterChange("unprinted")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              printedFilter === "unprinted"
                ? "bg-amber-500/25 text-amber-300 border border-amber-500/30 shadow-md shadow-amber-500/10"
                : "text-slate-400 hover:text-amber-200 hover:bg-white/5"
            }`}
            title="Exibir apenas modelos que nunca foram impressos"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Nunca Impressos</span>
          </button>
          <button
            onClick={() => onPrintedFilterChange("printed")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              printedFilter === "printed"
                ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 shadow-md shadow-emerald-500/10"
                : "text-slate-400 hover:text-emerald-200 hover:bg-white/5"
            }`}
            title="Exibir apenas modelos já impressos"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Já Impressos</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Format Tabs, Collections, Favorites & Sort */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-1">
        {/* Left: Format Tabs + Collection Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Format Filter Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {formats.map((f) => (
              <button
                key={f.value}
                onClick={() => onFormatSelect(f.value)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  selectedFormat === f.value
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Collection Dropdown Filter */}
          {collections.length > 0 && onCollectionSelect && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300">
              <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedCollection}
                onChange={(e) => onCollectionSelect(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                <option value="" className="bg-[#0f121d] text-white">
                  Todas as Coleções ({collections.length})
                </option>
                {collections.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#0f121d] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right Controls: Favorites + Sort + Counter */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Favorites Filter */}
          <button
            onClick={onToggleFavorites}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              favoritesOnly
                ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${favoritesOnly ? "fill-amber-400" : ""}`} />
            <span>Favoritos</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs text-slate-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-200 focus:outline-none cursor-pointer"
            >
              <option value="date_desc" className="bg-[#0f121d] text-white">Mais Recentes</option>
              <option value="name_asc" className="bg-[#0f121d] text-white">Nome (A - Z)</option>
              <option value="name_desc" className="bg-[#0f121d] text-white">Nome (Z - A)</option>
            </select>
          </div>

          {/* Total Count Badge */}
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            {totalCount} {totalCount === 1 ? "modelo" : "modelos"}
          </span>
        </div>
      </div>
    </div>
  );
}
