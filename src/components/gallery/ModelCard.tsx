"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

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
  viewMode?: "large" | "compact" | "table";
}

export default function ModelCard({
  model,
  onClick,
  onFavoriteToggle,
  onPrintedToggle,
  viewMode = "large",
}: ModelCardProps) {
  const [favorite, setFavorite] = useState(model.isFavorite);
  const [isPrinted, setIsPrinted] = useState(Boolean(model.isPrinted));

  useEffect(() => {
    setIsPrinted(Boolean(model.isPrinted));
  }, [model.isPrinted]);

  useEffect(() => {
    setFavorite(Boolean(model.isFavorite));
  }, [model.isFavorite]);

  const formats = Array.from(new Set(model.files.map((f) => f.format.toUpperCase())));

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
      console.error("Erro ao atualizar status de impressão:", err);
    }
  };

  // Render Table View Row
  if (viewMode === "table") {
    return (
      <tr
        onClick={onClick}
        className="group hover:bg-surface-container-high transition-colors cursor-pointer border-b border-white/5 text-xs text-on-surface"
      >
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface-container-lowest overflow-hidden flex-shrink-0 relative border border-white/5">
              {model.coverImage ? (
                <img
                  src={model.coverImage}
                  alt={model.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                  <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-on-surface group-hover:text-primary transition-colors truncate">
                {model.name}
              </span>
              <span className="text-[11px] text-on-surface-variant font-mono truncate">
                {model.library?.name}
              </span>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-1 flex-wrap">
            {formats.map((fmt) => (
              <span
                key={fmt}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                  fmt === "3MF"
                    ? "bg-secondary/20 text-secondary"
                    : fmt === "STL"
                    ? "bg-primary-container/20 text-primary"
                    : "bg-surface-container-highest text-on-surface-variant"
                }`}
              >
                .{fmt}
              </span>
            ))}
          </div>
        </td>
        <td className="py-2.5 px-3 font-mono text-[11px] text-on-surface-variant">
          {dimsText || "—"}
        </td>
        <td className="py-2.5 px-3 font-mono text-[11px] text-on-surface-variant">
          {model._count?.files || model.files.length} arquivos
        </td>
        <td className="py-2.5 px-3">
          <button
            type="button"
            onClick={handlePrintedClick}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
              isPrinted
                ? "bg-tertiary/15 text-tertiary border border-tertiary/30"
                : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {isPrinted ? "check_circle" : "schedule"}
            </span>
            <span>{isPrinted ? "Impresso" : "Nunca Impresso"}</span>
          </button>
        </td>
        <td className="py-2.5 px-3 text-right">
          <div className="flex items-center justify-end gap-1">
            <a
              href={`/models/${model.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1 rounded-lg text-on-surface-variant/40 hover:text-cyan-400 hover:bg-white/5 transition-colors"
              title="Abrir no Visualizador 3D Studio"
            >
              <span className="material-symbols-outlined text-[18px]">view_in_ar</span>
            </a>
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`p-1 rounded-lg transition-colors ${
                favorite
                  ? "text-amber-400"
                  : "text-on-surface-variant/40 hover:text-amber-400"
              }`}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            </button>
          </div>
        </td>
      </tr>
    );
  }

  // Render Grid Card (Large or Compact)
  return (
    <div
      onClick={onClick}
      className={`group relative flex flex-col rounded-xl bg-surface-container-low border border-white/5 hover:border-primary-container/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 cursor-pointer overflow-hidden ${
        viewMode === "compact" ? "gap-2 p-2" : "gap-3 p-3"
      }`}
    >
      {/* Thumbnail Area */}
      <div
        className={`relative w-full rounded-lg bg-surface-container-lowest overflow-hidden flex items-center justify-center border border-white/5 ${
          viewMode === "compact" ? "aspect-square" : "aspect-[4/3]"
        }`}
      >
        {model.coverImage ? (
          <img
            src={model.coverImage}
            alt={model.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-on-surface-variant/30 group-hover:text-primary transition-colors">
            <span className="material-symbols-outlined text-[44px]">view_in_ar</span>
            <span className="text-[10px] font-mono uppercase tracking-wider">3D Mesh</span>
          </div>
        )}

        {/* Top Badges Overlay: Formats & Favorite */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1 flex-wrap">
            {formats.map((fmt) => (
              <span
                key={fmt}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-md ${
                  fmt === "3MF"
                    ? "bg-secondary-container/90 text-on-secondary"
                    : fmt === "STL"
                    ? "bg-primary-container/90 text-on-primary"
                    : "bg-surface-container-highest/90 text-on-surface"
                }`}
              >
                .{fmt}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-1 pointer-events-auto">
            <a
              href={`/models/${model.id}`}
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg backdrop-blur-md bg-surface-container-lowest/70 hover:bg-cyan-950/90 text-white/70 hover:text-cyan-300 transition-all shadow-md opacity-0 group-hover:opacity-100"
              title="Abrir no Visualizador 3D Studio"
            >
              <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
            </a>
            <button
              type="button"
              onClick={handleFavoriteClick}
              className={`p-1.5 rounded-lg backdrop-blur-md transition-colors shadow-md ${
                favorite
                  ? "bg-surface-container-lowest/80 text-amber-400"
                  : "bg-surface-container-lowest/60 text-white/60 hover:text-amber-400 hover:bg-surface-container-lowest"
              }`}
              title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            >
              <span
                className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: favorite ? "'FILL' 1" : "'FILL' 0" }}
              >
                star
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Badges Overlay: Dimensions & Files count */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none text-[10px] font-mono">
          {dimsText && (
            <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest/85 backdrop-blur-md text-on-surface border border-white/5">
              {dimsText}
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded bg-surface-container-lowest/85 backdrop-blur-md text-on-surface-variant border border-white/5 ml-auto">
            {model._count?.files || model.files.length} arqs
          </span>
        </div>
      </div>

      {/* Info Body */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <h3 className="font-semibold text-sm text-on-surface group-hover:text-primary transition-colors truncate" title={model.name}>
          {model.name}
        </h3>

        <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
          <span className="truncate max-w-[65%]" title={model.library?.name}>
            {model.library?.name}
          </span>

          {/* Print Status Pill button */}
          <button
            type="button"
            onClick={handlePrintedClick}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              isPrinted
                ? "bg-tertiary/15 text-tertiary border border-tertiary/30"
                : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
            }`}
            title="Clique para alternar o status de impressão"
          >
            <span className="material-symbols-outlined text-[13px]">
              {isPrinted ? "check_circle" : "schedule"}
            </span>
            <span>{isPrinted ? "Impresso" : "Não impresso"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
