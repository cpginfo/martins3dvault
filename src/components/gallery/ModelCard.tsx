"use client";

import React, { useState, useEffect } from "react";
import { Box, Star, FileText, Layers, Check, CheckCircle2 } from "lucide-react";

export interface ModelCardData {
  id: string;
  name: string;
  folderPath: string;
  libraryId: string;
  library: { name: string };
  coverImage?: string | null;
  isFavorite: boolean;
  isPrinted?: boolean;
  printedAt?: string | null;
  filamentType?: string | null;
  files: Array<{
    id: string;
    fileName: string;
    format: string;
    fileSize: number;
    dimensionsX?: number | null;
    dimensionsY?: number | null;
    dimensionsZ?: number | null;
    triangleCount?: number | null;
    isPrinted?: boolean;
  }>;
  _count: {
    files: number;
    assets: number;
  };
}

interface ModelCardProps {
  model: ModelCardData;
  onClick: () => void;
  onFavoriteToggle?: (modelId: string, newState: boolean) => void;
  onPrintedToggle?: (modelId: string, newState: boolean) => void;
}

export default function ModelCard({
  model,
  onClick,
  onFavoriteToggle,
  onPrintedToggle,
}: ModelCardProps) {
  const [favorite, setFavorite] = useState(model.isFavorite);
  const [isPrinted, setIsPrinted] = useState(Boolean(model.isPrinted));

  useEffect(() => {
    setIsPrinted(Boolean(model.isPrinted));
  }, [model.isPrinted]);

  useEffect(() => {
    setFavorite(Boolean(model.isFavorite));
  }, [model.isFavorite]);

  // Formatos presentes no modelo
  const formats = Array.from(new Set(model.files.map((f) => f.format)));

  // Dimensões do arquivo primário ou primeiro arquivo com dimensões
  const primaryFile = model.files.find((f) => f.dimensionsX && f.dimensionsY && f.dimensionsZ);
  const dimsText = primaryFile
    ? `${Math.round(primaryFile.dimensionsX!)}×${Math.round(primaryFile.dimensionsY!)}×${Math.round(
        primaryFile.dimensionsZ!
      )} mm`
    : null;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !favorite;
    setFavorite(nextState);

    if (onFavoriteToggle) {
      onFavoriteToggle(model.id, nextState);
    }

    try {
      await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: nextState }),
      });
    } catch (err) {
      console.error("Erro ao favoritar modelo:", err);
    }
  };

  const handlePrintedClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isPrinted;
    setIsPrinted(nextState);

    if (onPrintedToggle) {
      onPrintedToggle(model.id, nextState);
    }

    try {
      await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrinted: nextState }),
      });
    } catch (err) {
      console.error("Erro ao atualizar status de impresso:", err);
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl overflow-hidden glass-card cursor-pointer"
    >
      {/* Cover Image & 3D Thumbnail Area */}
      <div className="relative aspect-[4/3] w-full bg-[#0d101d] overflow-hidden flex items-center justify-center border-b border-white/5">
        {model.coverImage ? (
          <img
            src={model.coverImage}
            alt={model.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-slate-600 group-hover:text-indigo-400 transition-colors">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-2 shadow-inner">
              <Box className="w-8 h-8 opacity-60" />
            </div>
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">
              Preview 3D Disponível
            </span>
          </div>
        )}

        {/* Formats Badges (.STL, .3MF) */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          {formats.map((fmt) => (
            <span
              key={fmt}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${
                fmt === "3MF"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                  : fmt === "STL"
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                  : "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
              }`}
            >
              .{fmt}
            </span>
          ))}
          {model._count.files > 1 && (
            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-black/60 backdrop-blur-md text-slate-300 border border-white/10 flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" />
              {model._count.files} peças
            </span>
          )}
        </div>

        {/* Top Right Controls: Print Status Check + Favorite Button */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          {/* Print Check Toggle Button */}
          <button
            onClick={handlePrintedClick}
            title={isPrinted ? "Marcado como impresso (clique para desmarcar)" : "Marcar como já impresso"}
            className={`px-2 py-1 rounded-xl backdrop-blur-md border text-[10px] font-semibold flex items-center gap-1.5 transition-all shadow-md ${
              isPrinted
                ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/35 shadow-emerald-500/20"
                : "bg-black/50 border-white/15 text-slate-400 hover:text-white hover:bg-black/70 hover:border-white/30"
            }`}
          >
            <CheckCircle2
              className={`w-3.5 h-3.5 transition-colors ${
                isPrinted ? "text-emerald-400 fill-emerald-400/20" : "text-slate-500"
              }`}
            />
            <span>{isPrinted ? "Impresso" : "Não impresso"}</span>
          </button>

          {/* Favorite Button */}
          <button
            onClick={handleFavoriteClick}
            title={favorite ? "Remover dos favoritos" : "Favoritar"}
            className="p-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/15 hover:bg-black/70 hover:border-white/30 transition-all text-slate-400 hover:text-white shadow-md"
          >
            <Star
              className={`w-3.5 h-3.5 transition-colors ${
                favorite ? "fill-amber-400 text-amber-400" : "text-slate-400 hover:text-white"
              }`}
            />
          </button>
        </div>

        {/* Bottom Dimensions Pill */}
        {dimsText && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-mono bg-black/60 backdrop-blur-md text-slate-300 border border-white/10">
            {dimsText}
          </div>
        )}
      </div>

      {/* Model Information Area */}
      <div className="p-4 flex flex-col justify-between flex-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-medium text-indigo-400 truncate max-w-[180px]">
              {model.library.name}
            </span>
            {model.filamentType && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-400 border border-white/5">
                {model.filamentType}
              </span>
            )}
          </div>
          <h3 className="font-semibold text-slate-100 text-sm tracking-tight leading-snug line-clamp-1 group-hover:text-indigo-300 transition-colors">
            {model.name}
          </h3>
        </div>

        {/* Metadata Footer */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
            /{model.folderPath}
          </span>
          <span className="text-[11px] text-indigo-400 font-medium group-hover:underline">
            Abrir 3D →
          </span>
        </div>
      </div>
    </div>
  );
}
