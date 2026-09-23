"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  X,
  Download,
  FileText,
  Save,
  Check,
  CheckCircle2,
  Layers,
  Printer,
  Pencil,
  Image as ImageIcon,
  Upload,
  Trash2,
  ExternalLink,
  Plus,
  Loader2,
  Folder,
  Copy,
  Sliders,
  Cpu,
  FileCode,
} from "lucide-react";
import ModelViewer3D, { ModelFileItem } from "@/components/viewer3d/ModelViewer3D";

export interface ModelDetailData {
  id: string;
  name: string;
  slug: string;
  folderPath: string;
  libraryId: string;
  library: { name: string };
  collectionId?: string | null;
  collection?: { id: string; name: string } | null;
  description?: string | null;
  filamentType?: string | null;
  nozzleSize?: number | null;
  infillDensity?: number | null;
  layerHeight?: number | null;
  printTimeMinutes?: number | null;
  notes?: string | null;
  isFavorite: boolean;
  isPrinted?: boolean;
  printedAt?: string | null;
  coverImage?: string | null;
  files: ModelFileItem[];
  assets: Array<{
    id: string;
    fileName: string;
    relativePath: string;
    assetType: string;
    fileSize: number;
  }>;
}

interface ModelDetailModalProps {
  model: ModelDetailData;
  onClose: () => void;
  onModelUpdated?: (updated: ModelDetailData) => void;
  onUpdate?: () => void;
}

export default function ModelDetailModal({
  model: initialModel,
  onClose,
  onModelUpdated,
  onUpdate,
}: ModelDetailModalProps) {
  const [model, setModel] = useState<ModelDetailData>(initialModel);
  const [activeTab, setActiveTab] = useState<"files" | "notes" | "manuals">("files");
  const [collectionsList, setCollectionsList] = useState<Array<{ id: string; name: string }>>([]);

  // Renomear modelo
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(model.name);
  const [savingName, setSavingName] = useState(false);

  // Trocar Capa
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverFileInputRef = useRef<HTMLInputElement>(null);

  // Upload de Manual
  const [uploadingManual, setUploadingManual] = useState(false);
  const [deletingManualId, setDeletingManualId] = useState<string | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  // Formulário de notas técnicas
  const [filamentType, setFilamentType] = useState(model.filamentType || "PLA");
  const [nozzleSize, setNozzleSize] = useState(model.nozzleSize?.toString() || "0.4");
  const [infillDensity, setInfillDensity] = useState(model.infillDensity?.toString() || "15");
  const [layerHeight, setLayerHeight] = useState(model.layerHeight?.toString() || "0.2");
  const [printTimeMinutes, setPrintTimeMinutes] = useState(model.printTimeMinutes?.toString() || "");
  const [notes, setNotes] = useState(model.notes || "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // Estados para dimensões e contagem de triângulos calculados dinamicamente no visualizador 3D
  const [liveDimensions, setLiveDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [liveTriangleCount, setLiveTriangleCount] = useState<number | null>(null);

  const handleCopyPath = () => {
    const fullPath = `${model.library.name}/${model.folderPath}`;
    navigator.clipboard.writeText(fullPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  useEffect(() => {
    setModel(initialModel);
    setEditedName(initialModel.name);
    setFilamentType(initialModel.filamentType || "PLA");
    setNozzleSize(initialModel.nozzleSize?.toString() || "0.4");
    setInfillDensity(initialModel.infillDensity?.toString() || "15");
    setLayerHeight(initialModel.layerHeight?.toString() || "0.2");
    setPrintTimeMinutes(initialModel.printTimeMinutes?.toString() || "");
    setNotes(initialModel.notes || "");
  }, [initialModel]);

  useEffect(() => {
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCollectionsList(data))
      .catch(() => {});
  }, []);

  // 1. Salvar Renomeação
  const handleSaveName = async () => {
    const trimmed = editedName.trim();
    if (!trimmed || trimmed === model.name) {
      setIsEditingName(false);
      return;
    }

    setSavingName(true);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (res.ok) {
        const updated = await res.json();
        const newModel = { ...model, name: updated.name };
        setModel(newModel);
        if (onModelUpdated) onModelUpdated(newModel);
        setIsEditingName(false);
      }
    } catch (err) {
      console.error("Erro ao renomear modelo:", err);
    } finally {
      setSavingName(false);
    }
  };

  // 2. Trocar Capa por Upload de Arquivo
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/models/${model.id}/cover`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const newModel = { ...model, coverImage: data.coverImage };
        setModel(newModel);
        if (onModelUpdated) onModelUpdated(newModel);
        setShowCoverPicker(false);
      }
    } catch (err) {
      console.error("Erro ao enviar nova capa:", err);
    } finally {
      setUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    }
  };

  // 2.2 Trocar Capa selecionando imagem existente na pasta
  const handleSelectExistingCover = async (imgRelPath: string) => {
    setUploadingCover(true);
    try {
      const coverUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(imgRelPath)}`;
      const res = await fetch(`/api/models/${model.id}/cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        const newModel = { ...model, coverImage: data.coverImage };
        setModel(newModel);
        if (onModelUpdated) onModelUpdated(newModel);
        setShowCoverPicker(false);
      }
    } catch (err) {
      console.error("Erro ao selecionar capa existente:", err);
    } finally {
      setUploadingCover(false);
    }
  };

  // 3. Upload de Manual em PDF
  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingManual(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/models/${model.id}/manual`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const assetObj = data.asset || data;
        const filtered = model.assets.filter((a) => a.id !== assetObj.id && a.fileName !== assetObj.fileName);
        const newModel = { ...model, assets: [...filtered, assetObj] };
        setModel(newModel);
        if (onModelUpdated) onModelUpdated(newModel);
      }
    } catch (err) {
      console.error("Erro ao fazer upload do manual:", err);
    } finally {
      setUploadingManual(false);
      if (manualFileInputRef.current) manualFileInputRef.current.value = "";
    }
  };

  // 3.2 Exclusão de Manual
  const handleDeleteManual = async (assetId: string) => {
    if (!confirm("Deseja realmente remover este manual?")) return;

    setDeletingManualId(assetId);
    try {
      const res = await fetch(`/api/models/${model.id}/manual?assetId=${assetId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const updatedAssets = model.assets.filter((a) => a.id !== assetId);
        const newModel = { ...model, assets: updatedAssets };
        setModel(newModel);
        if (onModelUpdated) onModelUpdated(newModel);
      }
    } catch (err) {
      console.error("Erro ao remover manual:", err);
    } finally {
      setDeletingManualId(null);
    }
  };

  const handleChangeCollection = async (newColId: string) => {
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: newColId || null }),
      });
      if (res.ok) {
        const selectedCol = collectionsList.find((c) => c.id === newColId) || null;
        const newModelData = {
          ...model,
          collectionId: newColId || null,
          collection: selectedCol,
        };
        setModel(newModelData);
        if (onModelUpdated) onModelUpdated(newModelData);
      }
    } catch (err) {
      console.error("Erro ao alterar coleção:", err);
    }
  };

  const handleToggleModelPrinted = async () => {
    const nextState = !model.isPrinted;
    const nowIso = nextState ? new Date().toISOString() : null;
    const newModelData = {
      ...model,
      isPrinted: nextState,
      printedAt: nowIso,
    };
    setModel(newModelData);
    if (onModelUpdated) onModelUpdated(newModelData);

    try {
      await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrinted: nextState }),
      });
    } catch (err) {
      console.error("Erro ao alternar status de impresso:", err);
    }
  };

  const handleToggleFilePrinted = async (fileId: string, newState: boolean) => {
    const updatedFiles = model.files.map((f) =>
      f.id === fileId ? { ...f, isPrinted: newState } : f
    );
    const newModelData = { ...model, files: updatedFiles };
    setModel(newModelData);
    if (onModelUpdated) onModelUpdated(newModelData);

    try {
      await fetch(`/api/models/${model.id}/files/${fileId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrinted: newState }),
      });
    } catch (err) {
      console.error("Erro ao alternar impresso no arquivo:", err);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filamentType,
          nozzleSize: parseFloat(nozzleSize) || null,
          infillDensity: parseInt(infillDensity) || null,
          layerHeight: parseFloat(layerHeight) || null,
          printTimeMinutes: printTimeMinutes ? parseInt(printTimeMinutes) : null,
          notes,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setModel((prev) => ({ ...prev, ...updated }));
        if (onModelUpdated) onModelUpdated({ ...model, ...updated });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Erro ao salvar notas de impressão:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSnapshotSaved = (newCover: string) => {
    setModel((prev) => ({ ...prev, coverImage: newCover }));
    if (onModelUpdated) onModelUpdated({ ...model, coverImage: newCover });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const primaryFile = model.files.find((f) => f.isPrimary) || model.files[0];
  const manualAssets = model.assets.filter((a) => a.assetType === "PDF_MANUAL");
  const imageAssets = model.assets.filter((a) => a.assetType === "IMAGE");

  // Dimensões efetivas (calculadas em tempo real ou vindas do arquivo)
  const dimsX = liveDimensions?.x ?? primaryFile?.dimensionsX ?? null;
  const dimsY = liveDimensions?.y ?? primaryFile?.dimensionsY ?? null;
  const dimsZ = liveDimensions?.z ?? primaryFile?.dimensionsZ ?? null;

  // Triângulos totais
  const trisCount =
    liveTriangleCount ??
    primaryFile?.triangleCount ??
    (model.files.reduce((acc, f) => acc + (f.triangleCount || 0), 0) || null);

  // Fator de preenchimento real (se disponível no modelo, ex: infillDensity 15 -> 0.15)
  const realInfillPercent = model.infillDensity ?? (infillDensity ? parseInt(infillDensity) : null);
  const effectiveInfillFactor = realInfillPercent !== null 
    ? Math.min(1, Math.max(0.05, 0.10 + (realInfillPercent / 100) * 0.5))
    : 0.20;

  // Estimativa de consumo de filamento baseada no volume da bounding box (densidade ~1.24g/cm³ com infill)
  const estimatedVolumeCm3 =
    dimsX && dimsY && dimsZ
      ? (dimsX * dimsY * dimsZ * 0.001) * effectiveInfillFactor
      : null;
  const estimatedGrams = estimatedVolumeCm3 ? Math.round(estimatedVolumeCm3 * 1.24) : null;
  const estimatedMeters = estimatedGrams ? (estimatedGrams / 2.98).toFixed(1) : null;

  // Avaliação de compatibilidade de mesa
  const hasDimensions = Boolean(dimsX && dimsY && dimsZ);
  const maxDim = hasDimensions ? Math.max(dimsX || 0, dimsY || 0, dimsZ || 0) : null;
  const isBambuCompatible = maxDim !== null ? maxDim <= 256 : null;
  const isVoronCompatible = maxDim !== null ? maxDim <= 300 : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-6xl h-[92vh] flex flex-col md:flex-row rounded-3xl bg-surface-container-low border border-white/10 shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-black/40 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all backdrop-blur-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left: 3D Canvas Viewer */}
        <div className="flex-1 h-[45vh] md:h-full bg-black relative">
          <ModelViewer3D
            libraryId={model.libraryId}
            files={model.files}
            modelId={model.id}
            coverImageUrl={model.coverImage}
            onSnapshotSaved={handleSnapshotSaved}
            onDimensionsCalculated={(dims) => {
              setLiveDimensions(dims);
              if (primaryFile && (!primaryFile.dimensionsX || !primaryFile.dimensionsZ)) {
                fetch(`/api/models/${model.id}/files/${primaryFile.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    dimensionsX: dims.x,
                    dimensionsY: dims.y,
                    dimensionsZ: dims.z,
                  }),
                }).catch(() => {});
              }
            }}
            onTriangleCountCalculated={(tris) => {
              setLiveTriangleCount(tris);
              if (primaryFile && !primaryFile.triangleCount) {
                fetch(`/api/models/${model.id}/files/${primaryFile.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ triangleCount: tris }),
                }).catch(() => {});
              }
            }}
            headerAction={
              <Link
                href={`/models/${model.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-semibold transition-all backdrop-blur-md shadow-xl hover:shadow-cyan-500/25 shrink-0"
                title="Abrir no Visualizador 3D Studio em tela cheia"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Modo Studio 3D</span>
              </Link>
            }
          />
        </div>

        {/* Right: Sidebar Tabs & Details */}
        <div className="w-full md:w-[40%] h-[55vh] md:h-full flex flex-col border-t md:border-t-0 md:border-l border-white/10 bg-surface-container-lowest">
          {/* Header */}
          <div className="p-5 border-b border-white/10">
            {/* Full File / Folder Path Container */}
            <div className="pr-12 mb-3">
              <div
                className="flex items-start gap-2 text-xs font-mono bg-white/[0.04] border border-white/10 rounded-xl p-2.5 leading-relaxed text-slate-300 shadow-sm group hover:border-white/20 transition"
                title={`${model.library.name} / ${model.folderPath}`}
              >
                <Folder className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 font-mono text-[11px] leading-relaxed break-words [overflow-wrap:anywhere] select-all">
                  <span className="text-cyan-400 font-semibold shrink-0">
                    {model.library.name}
                  </span>
                  <span className="text-slate-500 mx-1 shrink-0">/</span>
                  <span className="text-slate-200 font-medium">
                    {model.folderPath}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10 transition shrink-0"
                  title="Copiar caminho completo"
                >
                  {copiedPath ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Editable Title */}
            {isEditingName ? (
              <div className="flex items-center gap-2 my-1">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  autoFocus
                  placeholder="Nome do Modelo"
                  className="flex-1 px-3 py-1.5 rounded-xl bg-white/10 border border-indigo-500 text-white text-base font-bold focus:outline-none shadow-inner"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  title="Salvar Nome"
                  className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  title="Cancelar"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between group">
                <h2 className="text-xl font-bold text-white tracking-tight leading-snug break-words">
                  {model.name}
                </h2>
                <button
                  onClick={() => {
                    setEditedName(model.name);
                    setIsEditingName(true);
                  }}
                  title="Renomear Modelo"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all opacity-70 group-hover:opacity-100"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Actions Bar: Collection, Change Cover & Print Check */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {/* Print Status Check Toggle */}
              <button
                onClick={handleToggleModelPrinted}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-all shadow-sm ${
                  model.isPrinted
                    ? "bg-emerald-500/25 border-emerald-400/50 text-emerald-300 hover:bg-emerald-500/35 shadow-emerald-500/20"
                    : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                }`}
                title={model.isPrinted ? "Modelo já impresso (clique para desmarcar)" : "Marcar projeto como já impresso"}
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${model.isPrinted ? "text-emerald-400 fill-emerald-400/20" : "text-slate-500"}`} />
                <span>{model.isPrinted ? "Impresso" : "Não impresso"}</span>
              </button>

              {/* Collection Selector */}
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-slate-300">
                <Layers className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="text-slate-500">Coleção:</span>
                <select
                  value={model.collection?.id || model.collectionId || ""}
                  onChange={(e) => handleChangeCollection(e.target.value)}
                  className="bg-transparent border-none text-[11px] text-indigo-300 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0f121d] text-white">Nenhuma (Avulso)</option>
                  {collectionsList.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[#0f121d] text-white">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Change Cover Button */}
              <div className="relative">
                <button
                  onClick={() => setShowCoverPicker(!showCoverPicker)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-slate-300 hover:text-white transition-all"
                  title="Trocar a Imagem de Capa"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Trocar Capa</span>
                </button>

                {/* Cover Picker Modal / Popover */}
                {showCoverPicker && (
                  <div className="absolute top-full left-0 mt-2 w-72 p-3 rounded-2xl bg-[#141828] border border-white/15 shadow-2xl z-30 animate-fadeIn">
                    <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2">
                      <span className="text-xs font-semibold text-white">Opções de Capa</span>
                      <button
                        onClick={() => setShowCoverPicker(false)}
                        className="text-slate-400 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Upload button */}
                    <button
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md mb-2.5 disabled:opacity-50"
                    >
                      {uploadingCover ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Enviar Imagem do PC</span>
                    </button>
                    <input
                      type="file"
                      ref={coverFileInputRef}
                      onChange={handleCoverUpload}
                      accept="image/png,image/jpeg,image/webp,image/jpg"
                      className="hidden"
                    />

                    {/* Existing Folder Images Picker */}
                    {imageAssets.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block mb-1.5">
                          Imagens na Pasta ({imageAssets.length})
                        </span>
                        <div className="grid grid-cols-3 gap-1.5 max-h-36 overflow-y-auto">
                          {imageAssets.map((img) => {
                            const imgUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(img.relativePath)}`;
                            return (
                              <button
                                key={img.id}
                                onClick={() => handleSelectExistingCover(img.relativePath)}
                                className="group relative aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-indigo-500 transition-all"
                                title={`Usar ${img.fileName}`}
                              >
                                <img
                                  src={imgUrl}
                                  alt={img.fileName}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Studio 3D Shortcut Button */}
              <Link
                href={`/models/${model.id}`}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[11px] font-semibold transition-all shadow-sm hover:shadow-cyan-500/20"
                title="Abrir no Visualizador 3D Studio em tela cheia"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Modo Studio 3D</span>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 px-5 pt-3 border-b border-white/5 text-xs font-medium">
            <button
              onClick={() => setActiveTab("files")}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "files"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Arquivos ({model.files.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "notes"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Notas de Impressão</span>
            </button>
            <button
              onClick={() => setActiveTab("manuals")}
              className={`pb-3 border-b-2 flex items-center gap-1.5 transition-all ${
                activeTab === "manuals"
                  ? "border-indigo-500 text-indigo-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Manuais ({manualAssets.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            {/* TAB 1: Arquivos 3D & Parâmetros Técnicos */}
            {activeTab === "files" && (
              <div className="flex flex-col gap-4">
                {/* Files List */}
                <div className="flex flex-col gap-2.5">
                  {model.files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-white truncate max-w-[200px]" title={file.fileName}>
                          {file.fileName}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                          <span className="font-bold text-indigo-400">.{file.format}</span>
                          <span>•</span>
                          <span>{formatFileSize(file.fileSize)}</span>
                          {(file.triangleCount || (file.id === primaryFile?.id && trisCount)) && (
                            <>
                              <span>•</span>
                              <span>{(file.triangleCount || trisCount)?.toLocaleString("pt-BR")} faces</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Check Piece Printed */}
                        <button
                          onClick={() => handleToggleFilePrinted(file.id, !file.isPrinted)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            file.isPrinted
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10"
                          }`}
                          title={file.isPrinted ? "Peça marcada como impressa (clique para desmarcar)" : "Marcar peça como impressa"}
                        >
                          <CheckCircle2 className={`w-3.5 h-3.5 ${file.isPrinted ? "text-emerald-400 fill-emerald-400/20" : "text-slate-500"}`} />
                          <span className="text-[11px]">{file.isPrinted ? "Impresso" : "Imprimir"}</span>
                        </button>

                        <a
                          href={`/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                            file.relativePath
                          )}&download=true`}
                          download={file.fileName}
                          className="p-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 transition-all"
                          title="Baixar arquivo 3D"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Slicing & Print Profile Technical Parameters */}
                <div className="space-y-2.5 pt-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Parâmetros de Fatiamento (Perfil do Arquivo)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Altura de Camada
                      </span>
                      <span className="text-xs font-mono font-bold text-white mt-0.5 block">
                        {model.layerHeight || layerHeight ? (
                          <>
                            {model.layerHeight || layerHeight} mm{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              {parseFloat(String(model.layerHeight || layerHeight)) <= 0.12 ? "(Fina)" : parseFloat(String(model.layerHeight || layerHeight)) <= 0.20 ? "(Standard)" : "(Rápida)"}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 font-normal">--</span>
                        )}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Tempo Estimado
                      </span>
                      <span className="text-xs font-mono font-bold text-orange-400 mt-0.5 block">
                        {model.printTimeMinutes || printTimeMinutes ? (
                          `${Math.floor(parseInt(String(model.printTimeMinutes || printTimeMinutes)) / 60)}h ${parseInt(String(model.printTimeMinutes || printTimeMinutes)) % 60}m`
                        ) : (
                          <span className="text-slate-500 font-normal text-[11px]" title="Tempo não embutido no arquivo. Você pode definir na aba Notas de Impressão">
                            -- <span className="text-[10px] text-slate-600 block">(na aba Notas)</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Consumo de Filamento
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-300 mt-0.5 block">
                        {estimatedGrams ? (
                          <>
                            {estimatedGrams} g{" "}
                            <span className="text-[10px] font-normal text-slate-400">
                              (~{estimatedMeters || "0"} m)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 font-normal text-[11px]" title="Calculado automaticamente ao abrir a malha 3D">
                            -- <span className="text-[10px] text-slate-600 block">(carregue 3D)</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-2.5 rounded-xl">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Triângulos (Malha)
                      </span>
                      <span className="text-xs font-mono font-bold text-purple-300 mt-0.5 block">
                        {trisCount ? (
                          `${trisCount.toLocaleString("pt-BR")} faces`
                        ) : (
                          <span className="text-slate-500 font-normal text-[11px]">
                            -- <span className="text-[10px] text-slate-600 block">(carregue 3D)</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bed Compatibility & Printer Hardware Match */}
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Compatibilidade de Volume</span>
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isBambuCompatible === true
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/40"
                          : isVoronCompatible === true
                          ? "bg-amber-950/60 text-amber-400 border-amber-800/40"
                          : isBambuCompatible === false
                          ? "bg-rose-950/60 text-rose-400 border-rose-800/40"
                          : "bg-slate-800/60 text-slate-400 border-slate-700/40"
                      }`}
                    >
                      {isBambuCompatible === true
                        ? "100% Compatível"
                        : isVoronCompatible === true
                        ? "Mesa Grande Requerida"
                        : isBambuCompatible === false
                        ? "Excede Mesas"
                        : "Aguardando 3D"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {hasDimensions ? (
                      <>
                        <span className="text-slate-300 font-mono block mb-1">
                          Dimensões reais: {dimsX} × {dimsY} × {dimsZ} mm
                        </span>
                        {isBambuCompatible
                          ? "O volume cabe perfeitamente nas mesas padrão 256×256×256 mm (Bambu Lab X1/P1P) e 300×300 mm (Voron 2.4 / Creality K1 Max)."
                          : isVoronCompatible
                          ? "O volume excede 256mm mas cabe nas mesas de 300×300 mm (Voron 2.4 / Creality K1 Max)."
                          : "O volume excede as mesas padrão convencionais. Requer corte ou redução de escala no fatiador."}
                      </>
                    ) : (
                      "Clique em 'Carregar Malha 3D' para calcular as dimensões reais da peça e verificar compatibilidade de mesa."
                    )}
                  </p>
                  {hasDimensions && (
                    <div className="flex gap-1.5 pt-0.5 text-[10px] font-mono flex-wrap">
                      <span className={`px-2 py-0.5 rounded border ${isBambuCompatible ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-black/30 text-slate-500 border-white/5"}`}>
                        Bambu X1C (256mm)
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${isVoronCompatible || isBambuCompatible ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-black/30 text-slate-500 border-white/5"}`}>
                        Voron 2.4 (300mm)
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${isVoronCompatible || isBambuCompatible ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-black/30 text-slate-500 border-white/5"}`}>
                        Creality K1 Max
                      </span>
                    </div>
                  )}
                </div>

                {/* Material & Slicing Specifications */}
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Filamento Recomendado</span>
                    <span className="text-white font-medium">{model.filamentType || filamentType || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Preenchimento (Infill)</span>
                    <span className="text-cyan-300 font-mono">
                      {realInfillPercent ? `${realInfillPercent}% Gyroid/Grid` : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bico (Nozzle)</span>
                    <span className="text-white font-mono">
                      {model.nozzleSize || nozzleSize ? `${model.nozzleSize || nozzleSize} mm` : "--"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Notas de Impressão */}
            {activeTab === "notes" && (
              <div className="flex flex-col gap-4">
                {/* Print Status Banner in Notes */}
                <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  model.isPrinted
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                    : "bg-white/5 border-white/10 text-slate-300"
                }`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className={`w-5 h-5 ${model.isPrinted ? "text-emerald-400 fill-emerald-400/20" : "text-slate-500"}`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white">
                        {model.isPrinted ? "Projeto Marcado como Impresso" : "Ainda Não Impresso"}
                      </span>
                      {model.printedAt ? (
                        <span className="text-[10px] text-emerald-400/80">
                          Data: {new Date(model.printedAt).toLocaleDateString()} às {new Date(model.printedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Este modelo ainda está na fila de impressões pendentes.
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleToggleModelPrinted}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      model.isPrinted
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30"
                        : "bg-indigo-600 hover:bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                    }`}
                  >
                    {model.isPrinted ? "Desmarcar" : "Marcar Impresso"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Filamento</label>
                    <input
                      type="text"
                      value={filamentType}
                      onChange={(e) => setFilamentType(e.target.value)}
                      placeholder="Ex: PLA, PETG, ABS"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bico (mm)</label>
                    <input
                      type="text"
                      value={nozzleSize}
                      onChange={(e) => setNozzleSize(e.target.value)}
                      placeholder="0.4"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Infill (%)</label>
                    <input
                      type="number"
                      value={infillDensity}
                      onChange={(e) => setInfillDensity(e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Camada (mm)</label>
                    <input
                      type="text"
                      value={layerHeight}
                      onChange={(e) => setLayerHeight(e.target.value)}
                      placeholder="0.2"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tempo Estimado (minutos)</label>
                    <input
                      type="number"
                      value={printTimeMinutes}
                      onChange={(e) => setPrintTimeMinutes(e.target.value)}
                      placeholder="Ex: 180"
                      className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Notas Técnicas & Dicas</label>
                  <textarea
                    rows={4}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex: Usar suportes em árvore, 3 perímetros de parede, temperatura da mesa a 60°C..."
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                  className="flex items-center justify-center gap-2 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {saveSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Parâmetros Salvos!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{savingNotes ? "Salvando..." : "Salvar Parâmetros"}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* TAB 3: Manuais & Documentação em PDF */}
            {activeTab === "manuals" && (
              <div className="flex flex-col gap-3">
                {/* Header with Upload Button */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <span className="text-xs font-semibold text-slate-300">
                    Documentação & Manuais
                  </span>
                  <button
                    onClick={() => manualFileInputRef.current?.click()}
                    disabled={uploadingManual}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-all shadow-md disabled:opacity-50"
                  >
                    {uploadingManual ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Enviar Manual (PDF)</span>
                  </button>
                  <input
                    type="file"
                    ref={manualFileInputRef}
                    onChange={handleManualUpload}
                    accept="application/pdf,.pdf"
                    className="hidden"
                  />
                </div>

                {manualAssets.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center">
                    <FileText className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
                    <p>Nenhum manual PDF vinculado a este modelo.</p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Clique em &quot;Enviar Manual (PDF)&quot; acima para adicionar instruções de montagem.
                    </p>
                  </div>
                ) : (
                  manualAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col max-w-[170px] sm:max-w-[220px]">
                          <span className="text-xs font-medium text-white truncate">
                            {asset.fileName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatFileSize(asset.fileSize)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                            asset.relativePath
                          )}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] text-white font-medium transition-all"
                          title="Visualizar PDF"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Abrir</span>
                        </a>

                        <a
                          href={`/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                            asset.relativePath
                          )}&download=true`}
                          download={asset.fileName}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
                          title="Baixar PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleDeleteManual(asset.id)}
                          disabled={deletingManualId === asset.id}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-all disabled:opacity-50"
                          title="Remover Manual"
                        >
                          {deletingManualId === asset.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
