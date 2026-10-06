"use client";

import React, { useState, useEffect, use, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  X,
  Pencil,
  Check,
  CheckCircle2,
  ChevronDown,
  Image as ImageIcon,
  Layers,
  Printer,
  FileText,
  FileCode,
  Download,
  Send,
  Cpu,
  Sliders,
  ShieldCheck,
  ArrowLeft,
  Upload,
  Trash2,
  Loader2,
  Save,
  Clock,
  Sparkles,
  ExternalLink,
  Folder,
  Copy,
  Calculator,
  Wrench,
  TrendingUp,
  Archive,
} from "lucide-react";
import ModelViewer3D, { ModelFileItem } from "@/components/viewer3d/ModelViewer3D";
import { calculatePrintCost, formatBRL } from "@/lib/pricing/calculator";
import { PrinterConfig, MaterialConfig, BudgetCalculationInput } from "@/lib/pricing/types";

interface ModelDetailData {
  id: string;
  name: string;
  slug: string;
  folderPath: string;
  libraryId: string;
  library: { id: string; name: string };
  collectionId?: string | null;
  collection?: { id: string; name: string } | null;
  description?: string | null;
  filamentType?: string | null;
  nozzleSize?: number | null;
  infillDensity?: number | null;
  layerHeight?: number | null;
  printTimeMinutes?: number | null;
  weightGrams?: number | null;
  manualTimeMinutes?: number | null;
  notes?: string | null;
  isFavorite: boolean;
  isPrinted?: boolean;
  printedAt?: string | null;
  coverImage?: string | null;
  updatedAt: string;
  files: ModelFileItem[];
  assets: Array<{
    id: string;
    fileName: string;
    relativePath: string;
    assetType: string;
    fileSize: number;
  }>;
}

export default function ModelStudioPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(props.params);
  const router = useRouter();

  const [model, setModel] = useState<ModelDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"files" | "notes" | "manuals">("files");
  const [mobileTab, setMobileTab] = useState<"viewer" | "details">("viewer");
  const [collectionsList, setCollectionsList] = useState<Array<{ id: string; name: string }>>([]);

  // Dimensões dinâmicas calculadas pela malha 3D
  const [liveDimensions, setLiveDimensions] = useState<{ x: number; y: number; z: number } | null>(null);
  const [liveTriangleCount, setLiveTriangleCount] = useState<number | null>(null);

  // Renomeação inline
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // Dropdown de Coleção
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [updatingCollection, setUpdatingCollection] = useState(false);

  // Troca de Capa
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Upload e exclusão de manuais
  const [uploadingManual, setUploadingManual] = useState(false);
  const [deletingManualId, setDeletingManualId] = useState<string | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  // Formulário de notas técnicas
  const [filamentType, setFilamentType] = useState("");
  const [nozzleSize, setNozzleSize] = useState("");
  const [infillDensity, setInfillDensity] = useState("");
  const [layerHeight, setLayerHeight] = useState("");
  const [printHours, setPrintHours] = useState("");
  const [printMinutes, setPrintMinutes] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [manualHours, setManualHours] = useState("");
  const [manualMinutes, setManualMinutes] = useState("");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  const handleCopyPath = () => {
    if (!model) return;
    const primary = model.files.find((f) => f.isPrimary) || model.files[0];
    const fullPath = `${model.library?.name || "Arquivos"}/${primary?.relativePath || model.folderPath}`;
    navigator.clipboard.writeText(fullPath);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Busca detalhes do modelo
  const fetchModel = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/models/${id}`);
      if (!res.ok) {
        throw new Error("Modelo não encontrado");
      }
      const data: ModelDetailData = await res.json();
      setModel(data);
      setEditedName(data.name);
      setFilamentType(data.filamentType || "");
      setNozzleSize(data.nozzleSize?.toString() || "");
      setInfillDensity(data.infillDensity?.toString() || "");
      setLayerHeight(data.layerHeight?.toString() || "");
      setWeightGrams(data.weightGrams?.toString() || "");

      const totalM = data.printTimeMinutes ?? null;
      if (totalM !== null && !isNaN(totalM)) {
        setPrintHours(Math.floor(totalM / 60).toString());
        setPrintMinutes((totalM % 60).toString());
      } else {
        setPrintHours("");
        setPrintMinutes("");
      }

      const manualM = data.manualTimeMinutes ?? null;
      if (manualM !== null && !isNaN(manualM)) {
        setManualHours(Math.floor(manualM / 60).toString());
        setManualMinutes((manualM % 60).toString());
      } else {
        setManualHours("");
        setManualMinutes("");
      }

      setNotes(data.notes || "");
    } catch (err: any) {
      setError(err.message || "Erro ao carregar modelo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModel();
    fetch("/api/collections")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setCollectionsList(data))
      .catch(() => {});
  }, [id]);

  // Configurações de precificação para estimativa em tempo real
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
    printerCost: 2500,
    powerWatts: 250,
    lifespanHours: 3000,
    electricityKwhCost: 0.85,
    manualHourlyRate: 35,
    defaultMarkup: 100,
  });
  const [materialsList, setMaterialsList] = useState<MaterialConfig[]>([]);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch("/api/pricing/settings").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/pricing/materials").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([settings, mats]) => {
        if (ignore) return;
        if (settings) setPrinterConfig(settings);
        if (Array.isArray(mats)) setMaterialsList(mats);
      })
      .catch((err) => console.error("Erro ao carregar configurações de precificação:", err));

    return () => {
      ignore = true;
    };
  }, []);

  const selectedMaterial = useMemo(() => {
    const fil = (filamentType || "").trim().toLowerCase();
    if (!fil) return materialsList[0] || null;
    return (
      materialsList.find((m) => m.name.toLowerCase() === fil) ||
      materialsList.find((m) => m.name.toLowerCase().includes(fil)) ||
      materialsList.find((m) => fil.includes(m.name.toLowerCase())) ||
      null
    );
  }, [filamentType, materialsList]);

  const materialCostPerKg = selectedMaterial?.costPerKg ?? 110;

  const approxBreakdown = useMemo(() => {
    const totalM = model?.printTimeMinutes ?? null;
    const pH = printHours !== "" ? (Number(printHours) || 0) : (totalM !== null ? Math.floor(totalM / 60) : 0);
    const pM = printMinutes !== "" ? (Number(printMinutes) || 0) : (totalM !== null ? totalM % 60 : 0);
    const wG = weightGrams !== "" ? (Number(weightGrams) || 0) : (model?.weightGrams ? Number(model.weightGrams) : 0);
    const manualM = model?.manualTimeMinutes ?? null;
    const mH = manualHours !== "" ? (Number(manualHours) || 0) : (manualM !== null ? Math.floor(manualM / 60) : 0);
    const mM = manualMinutes !== "" ? (Number(manualMinutes) || 0) : (manualM !== null ? manualM % 60 : 0);

    if (pH === 0 && pM === 0 && wG === 0 && mH === 0 && mM === 0) {
      return null;
    }

    const input: BudgetCalculationInput = {
      productName: model?.name || "Modelo",
      printTimeHours: pH,
      printTimeMinutes: pM,
      weightGrams: wG,
      materialCostPerKg,
      materialName: selectedMaterial?.name || filamentType || model?.filamentType || "PLA",
      assemblyTimeHours: mH,
      assemblyTimeMinutes: mM,
      markupPercent: printerConfig.defaultMarkup ?? 100,
    };

    return calculatePrintCost(input, printerConfig);
  }, [printHours, printMinutes, weightGrams, manualHours, manualMinutes, materialCostPerKg, selectedMaterial, filamentType, model, printerConfig]);

  // Salvar Renomeação
  const handleSaveName = async () => {
    if (!model) return;
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
        setModel({ ...model, name: updated.name });
        setIsEditingName(false);
      }
    } catch (err) {
      console.error("Erro ao renomear:", err);
    } finally {
      setSavingName(false);
    }
  };

  // Alternar status de impresso
  const handleTogglePrinted = async () => {
    if (!model) return;
    const nextState = !model.isPrinted;
    setModel({ ...model, isPrinted: nextState });

    try {
      await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrinted: nextState }),
      });
    } catch (err) {
      console.error("Erro ao alternar status de impressão:", err);
    }
  };

  // Alterar coleção
  const handleSelectCollection = async (collId: string | null) => {
    if (!model) return;
    setUpdatingCollection(true);
    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: collId }),
      });
      if (res.ok) {
        const selectedColl = collectionsList.find((c) => c.id === collId);
        setModel({
          ...model,
          collectionId: collId,
          collection: selectedColl ? { id: selectedColl.id, name: selectedColl.name } : null,
        });
        setShowCollectionDropdown(false);
      }
    } catch (err) {
      console.error("Erro ao atualizar coleção:", err);
    } finally {
      setUpdatingCollection(false);
    }
  };

  // Salvar Notas Técnicas
  const handleSaveNotes = async () => {
    if (!model) return;
    setSavingNotes(true);
    setNotesSaved(false);

    const hasPrintTime = printHours !== "" || printMinutes !== "";
    const totalPrintMinutes = hasPrintTime
      ? (parseInt(printHours || "0", 10) * 60) + parseInt(printMinutes || "0", 10)
      : null;

    const hasManualTime = manualHours !== "" || manualMinutes !== "";
    const totalManualMinutes = hasManualTime
      ? (parseInt(manualHours || "0", 10) * 60) + parseInt(manualMinutes || "0", 10)
      : null;

    try {
      const res = await fetch(`/api/models/${model.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filamentType,
          nozzleSize,
          infillDensity,
          layerHeight,
          printTimeMinutes: totalPrintMinutes,
          weightGrams: weightGrams ? parseFloat(weightGrams) : null,
          manualTimeMinutes: totalManualMinutes,
          notes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setModel((prev) => (prev ? { ...prev, ...updated } : null));
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 3000);
      }
    } catch (err) {
      console.error("Erro ao salvar notas:", err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Redirecionar para Orçamento com os dados preenchidos
  const handleGoToPricing = () => {
    if (!model) return;
    const pHours = printHours !== "" ? printHours : (model.printTimeMinutes ? Math.floor(model.printTimeMinutes / 60).toString() : "0");
    const pMinutes = printMinutes !== "" ? printMinutes : (model.printTimeMinutes ? (model.printTimeMinutes % 60).toString() : "0");
    const mHours = manualHours !== "" ? manualHours : (model.manualTimeMinutes ? Math.floor(model.manualTimeMinutes / 60).toString() : "0");
    const mMinutes = manualMinutes !== "" ? manualMinutes : (model.manualTimeMinutes ? (model.manualTimeMinutes % 60).toString() : "0");
    const weight = weightGrams !== "" ? weightGrams : (model.weightGrams ? model.weightGrams.toString() : (estimatedGrams ? estimatedGrams.toString() : "0"));
    const fil = filamentType || model.filamentType || "";

    const params = new URLSearchParams({
      tab: "calculator",
      productName: model.name,
      weightGrams: weight || "0",
      printTimeHours: pHours || "0",
      printTimeMinutes: pMinutes || "0",
      assemblyTimeHours: mHours || "0",
      assemblyTimeMinutes: mMinutes || "0",
    });
    if (fil) {
      params.set("filamentType", fil);
    }

    router.push(`/pricing?${params.toString()}`);
  };

  // Upload de Capa
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !model) return;

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
        setModel({ ...model, coverImage: data.coverImage });
        setShowCoverModal(false);
      }
    } catch (err) {
      console.error("Erro no upload de capa:", err);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Upload de Manual PDF
  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !model) return;

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
        setModel({
          ...model,
          assets: [...filtered, assetObj],
        });
      }
    } catch (err) {
      console.error("Erro no upload de manual:", err);
    } finally {
      setUploadingManual(false);
      if (manualInputRef.current) manualInputRef.current.value = "";
    }
  };

  // Excluir manual
  const handleDeleteManual = async (assetId: string) => {
    if (!model) return;
    setDeletingManualId(assetId);
    try {
      const res = await fetch(`/api/models/${model.id}/manual?assetId=${assetId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setModel({
          ...model,
          assets: model.assets.filter((a) => a.id !== assetId),
        });
      }
    } catch (err) {
      console.error("Erro ao excluir manual:", err);
    } finally {
      setDeletingManualId(null);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#070a0e] text-slate-200">
        <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mb-4" />
        <p className="text-sm font-mono tracking-wider text-slate-400">
          Carregando Visualizador 3D Studio...
        </p>
      </div>
    );
  }

  if (error || !model) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#070a0e] text-slate-200 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
          <X className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Erro ao abrir arquivo 3D</h1>
        <p className="text-sm text-slate-400 mb-6 max-w-md">{error || "Modelo não encontrado"}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141e2a] hover:bg-[#1c2a3b] text-slate-200 text-xs font-semibold border border-[#203042] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Catálogo</span>
        </Link>
      </div>
    );
  }

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
  // Modelo FDM usa casca externa sólida (walls/top/bottom ~12%) + preenchimento interno esparso
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

  // Formatação de bytes
  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Formatação de data
  const updatedDateStr = new Date(model.updatedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#070a0e] text-slate-200 flex flex-col select-none">
      {/* BEGIN: TopGlobalBar */}
      <header className="h-11 bg-[#090d13] border-b border-[#182230] px-3 sm:px-4 flex items-center justify-between text-xs shrink-0 z-30">
        <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
          <Link href="/" className="flex items-center space-x-2 group shrink-0">
            <span className="w-2.5 h-2.5 rounded-sm bg-gradient-to-tr from-cyan-500 to-orange-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
            <span className="font-bold tracking-wider text-slate-100 uppercase text-[11px] group-hover:text-white transition">
              Martins<span className="text-cyan-400">3D</span><span className="hidden sm:inline">Vault</span>
            </span>
          </Link>
          <span className="text-slate-600 shrink-0">/</span>
          <span className="px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 font-mono text-[10px] border border-cyan-800/40 shrink-0">
            <span className="hidden sm:inline">VISUALIZADOR </span>3D STUDIO
          </span>
          {model && (
            <>
              <span className="text-slate-700 hidden xl:inline shrink-0">|</span>
              <span
                className="hidden xl:inline text-slate-400 font-mono text-[11px] truncate max-w-sm select-all"
                title={`${model.library?.name || 'Arquivos'} / ${primaryFile?.relativePath || model.folderPath}`}
              >
                <span className="text-slate-500">{model.library?.name || 'Arquivos'} / </span>
                <span className="text-slate-300">{primaryFile?.relativePath || model.folderPath}</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 text-slate-400 font-mono text-[11px] shrink-0">
          <button
            type="button"
            onClick={handleGoToPricing}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 hover:border-emerald-500/60 font-semibold transition cursor-pointer min-h-[32px]"
            title="Calcular orçamento e custos deste modelo"
          >
            <Calculator className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Orçamento</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition min-h-[32px]"
            title="Voltar ao Catálogo"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Catálogo</span>
          </button>
        </div>
      </header>
      {/* END: TopGlobalBar */}

      {/* Mobile Tab Switcher (Visible only below lg) */}
      <div className="lg:hidden flex items-center bg-[#0a0f16] border-b border-[#182332] p-1 gap-1 shrink-0 z-20">
        <button
          type="button"
          onClick={() => setMobileTab("viewer")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === "viewer"
              ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">view_in_ar</span>
          <span>Visualizador 3D</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("details")}
          className={`flex-1 py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
            mobileTab === "details"
              ? "bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">description</span>
          <span>Ficha Técnica & Notas</span>
        </button>
      </div>

      {/* BEGIN: WorkspaceContainer */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative" data-purpose="interactive-workspace">
        {/* BEGIN: ViewportSection (Left Area) */}
        <section
          className={`flex-1 relative flex-col bg-[#05080c] overflow-hidden border-r border-[#161f2c] ${
            mobileTab === "viewer" ? "flex" : "hidden lg:flex"
          }`}
          data-purpose="3d-viewport"
        >
          {/* Depth Backdrop Ambient Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-950/20 via-[#06090d] to-[#040609] pointer-events-none z-0" />

          {/* Interactive 3D Model Canvas Component */}
          <div className="relative z-10 w-full h-full">
            <ModelViewer3D
              libraryId={model.libraryId}
              files={model.files}
              modelId={model.id}
              coverImageUrl={model.coverImage}
              onSnapshotSaved={(newCover) => {
                setModel((prev) => (prev ? { ...prev, coverImage: newCover } : prev));
              }}
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
            />
          </div>
        </section>
        {/* END: ViewportSection */}

        {/* BEGIN: RightDetailsPanel */}
        <aside
          className={`w-full lg:w-[430px] shrink-0 bg-[#0c1117] flex-col border-l border-[#1a2433] h-full overflow-y-auto ${
            mobileTab === "details" ? "flex" : "hidden lg:flex"
          }`}
          data-purpose="details-drawer"
        >
          {/* Drawer Header with breadcrumb, action buttons and title */}
          <div className="p-5 border-b border-[#182332]">
            {/* Breadcrumb & Close/Edit Controls */}
            <div className="flex items-center justify-between mb-3 gap-2">
              <nav className="flex items-center space-x-1.5 text-xs text-slate-400 min-w-0 pr-2">
                <Link href="/" className="hover:text-cyan-400 transition shrink-0">
                  Catálogo
                </Link>
                <span className="text-slate-600 shrink-0">/</span>
                <span className="text-slate-400 truncate">
                  {model.collection?.name || model.library?.name || "Arquivos"}
                </span>
              </nav>
              <div className="flex items-center space-x-1 shrink-0">
                <button
                  onClick={() => setIsEditingName(!isEditingName)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#16202c] transition"
                  title="Editar nome"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      router.back();
                    } else {
                      router.push("/");
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-[#16202c] transition"
                  title="Fechar painel e voltar ao catálogo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Full File / Folder Path Container */}
            <div className="mb-3.5">
              <div
                className="flex items-start gap-2.5 text-xs font-mono bg-[#111722] border border-[#1f2b3a] rounded-xl p-2.5 text-slate-300 shadow-sm group hover:border-[#2f4058] transition"
                title={`${model.library?.name || 'Arquivos'} / ${primaryFile?.relativePath || model.folderPath}`}
              >
                <Folder className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0 font-mono text-[11px] leading-relaxed break-words [overflow-wrap:anywhere] select-all">
                  <span className="text-cyan-400 font-semibold shrink-0">
                    {model.library?.name || "Arquivos"}
                  </span>
                  <span className="text-slate-500 mx-1 shrink-0">/</span>
                  <span className="text-slate-200 font-medium">
                    {primaryFile?.relativePath || model.folderPath}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPath}
                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/5 transition shrink-0"
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

            {/* Project / Model Title (Editable Inline) */}
            {isEditingName ? (
              <div className="flex items-center gap-2 mb-3">
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
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#141e2a] border border-cyan-500 text-white text-lg font-bold focus:outline-none"
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50"
                  title="Salvar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="p-2 rounded-lg bg-[#141e2a] text-slate-400 hover:text-white transition"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <h1 className="text-2xl font-bold tracking-tight text-white mb-3 break-words">
                {model.name}
              </h1>
            )}

            {/* Status Badges and Collection Selector Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Print Status Chip */}
              <button
                onClick={handleTogglePrinted}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition active:scale-95 ${
                  model.isPrinted
                    ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                    : "bg-[#141e2a] border-[#203042] text-slate-300 hover:border-slate-600"
                }`}
                title="Clique para alternar o status de impressão"
              >
                <CheckCircle2
                  className={`w-3.5 h-3.5 ${model.isPrinted ? "text-emerald-400" : "text-slate-400"}`}
                />
                <span>{model.isPrinted ? "Impresso" : "Não impresso"}</span>
              </button>

              {/* Collection Dropdown Chip */}
              <div className="relative">
                <button
                  onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141e2a] border border-[#203042] text-xs font-medium text-slate-200 hover:border-slate-600 transition"
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Coleção: <strong className="font-semibold text-white">{model.collection?.name || "Nenhuma"}</strong>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
                </button>

                {showCollectionDropdown && (
                  <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#0f1620] border border-[#1e2a39] shadow-2xl py-1 z-30 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => handleSelectCollection(null)}
                      className="w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-[#182332] hover:text-white transition"
                    >
                      (Nenhuma Coleção)
                    </button>
                    {collectionsList.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleSelectCollection(c.id)}
                        className={`w-full text-left px-3 py-2 text-xs transition ${
                          model.collectionId === c.id
                            ? "bg-cyan-950/60 text-cyan-300 font-semibold"
                            : "text-slate-300 hover:bg-[#182332] hover:text-white"
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Change Cover Button */}
              <button
                onClick={() => setShowCoverModal(true)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#141e2a] hover:bg-[#1b2838] border border-[#203042] text-xs font-medium text-cyan-300 transition"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Trocar Capa</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs (Arquivos, Notas de Impressão, Manuais) */}
          <div className="px-5 border-b border-[#182332] flex space-x-6 text-xs font-medium">
            <button
              onClick={() => setActiveTab("files")}
              className={`py-3 flex items-center space-x-1.5 transition ${
                activeTab === "files"
                  ? "border-b-2 border-cyan-400 text-cyan-400 font-semibold"
                  : "border-b-2 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Arquivos ({model.files.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={`py-3 flex items-center space-x-1.5 transition ${
                activeTab === "notes"
                  ? "border-b-2 border-cyan-400 text-cyan-400 font-semibold"
                  : "border-b-2 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Notas de Impressão</span>
            </button>
            <button
              onClick={() => setActiveTab("manuals")}
              className={`py-3 flex items-center space-x-1.5 transition ${
                activeTab === "manuals"
                  ? "border-b-2 border-cyan-400 text-cyan-400 font-semibold"
                  : "border-b-2 border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Manuais ({manualAssets.length})</span>
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="p-5 space-y-6 flex-1">
            {activeTab === "files" && (
              <>
                {/* Files List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Arquivos 3D ({model.files.length})
                    </span>
                    <a
                      href={`/api/models/${model.id}/download-zip`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-600/20 hover:bg-orange-600/30 text-orange-300 border border-orange-500/30 text-xs font-medium transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                      title="Baixar todos os arquivos 3D e anexos deste modelo em um único arquivo .ZIP"
                    >
                      <Archive className="w-3.5 h-3.5 text-orange-400" />
                      <span>Baixar Pacote .ZIP</span>
                    </a>
                  </div>
                  {model.files.map((file) => {
                    const downloadUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                      file.relativePath
                    )}&download=true`;
                    return (
                      <div
                        key={file.id}
                        className="bg-[#111720] border border-[#1e2a39] rounded-xl p-4 shadow-sm hover:border-[#28384d] transition"
                        data-purpose="file-card"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1.5 min-w-0 pr-2 flex-1">
                            <h2 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
                              <FileCode className="w-4 h-4 text-orange-500 shrink-0" />
                              <span className="break-words [overflow-wrap:anywhere]" title={file.fileName}>{file.fileName}</span>
                            </h2>
                            <div className="text-[11px] font-mono text-slate-400 break-words [overflow-wrap:anywhere] select-all">
                              {file.relativePath}
                            </div>
                            <div className="text-xs font-mono text-slate-400 flex items-center space-x-2">
                              <span className="px-1.5 py-0.5 rounded bg-blue-950/60 text-cyan-300 font-bold border border-cyan-800/40">
                                .{file.format.toUpperCase()}
                              </span>
                              <span>•</span>
                              <span>{formatBytes(file.fileSize)}</span>
                            </div>
                          </div>

                          {/* Quick Action Buttons */}
                          <div className="flex items-center space-x-2 shrink-0">
                            <a
                              href={downloadUrl}
                              download={file.fileName}
                              className="p-1.5 rounded-lg bg-[#182330] hover:bg-[#202f40] text-slate-300 hover:text-white border border-[#25374a] transition"
                              title="Baixar arquivo 3D"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slicing & Print Profile Technical Parameters */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Parâmetros de Fatiamento (Perfil do Arquivo)</span>
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="bg-[#10161f] border border-[#1b2635] p-3 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Altura de Camada
                      </span>
                      <span className="text-sm font-mono font-bold text-white mt-0.5 block">
                        {layerHeight ? (
                          <>
                            {layerHeight} mm{" "}
                            <span className="text-xs font-normal text-slate-500">
                              {parseFloat(layerHeight) <= 0.12 ? "(Fina)" : parseFloat(layerHeight) <= 0.20 ? "(Standard)" : "(Rápida)"}
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 font-normal">--</span>
                        )}
                      </span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1b2635] p-3 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Tempo Estimado
                      </span>
                      <span className="text-sm font-mono font-bold text-orange-400 mt-0.5 block">
                        {printHours || printMinutes ? (
                          `${printHours ? `${printHours}h ` : ""}${printMinutes || 0}m`
                        ) : model.printTimeMinutes ? (
                          `${Math.floor(model.printTimeMinutes / 60)}h ${model.printTimeMinutes % 60}m`
                        ) : (
                          <span className="text-slate-500 font-normal text-xs" title="Tempo não embutido no arquivo. Você pode definir na aba Parâmetros & Notas">
                            -- <span className="text-[10px] text-slate-600 block">(na aba Notas)</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1b2635] p-3 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Peso da Peça
                      </span>
                      <span className="text-sm font-mono font-bold text-cyan-300 mt-0.5 block">
                        {weightGrams ? (
                          `${weightGrams} g`
                        ) : model.weightGrams ? (
                          `${model.weightGrams} g`
                        ) : estimatedGrams ? (
                          <>
                            {estimatedGrams} g{" "}
                            <span className="text-xs font-normal text-slate-500">
                              (~{estimatedMeters || "0"} m)
                            </span>
                          </>
                        ) : (
                          <span className="text-slate-500 font-normal text-xs" title="Defina na aba Notas ou abra a malha 3D">
                            -- <span className="text-[10px] text-slate-600 block">(na aba Notas)</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1b2635] p-3 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Trabalho Manual
                      </span>
                      <span className="text-sm font-mono font-bold text-emerald-400 mt-0.5 block">
                        {manualHours || manualMinutes ? (
                          `${manualHours ? `${manualHours}h ` : ""}${manualMinutes || 0}m`
                        ) : model.manualTimeMinutes ? (
                          `${Math.floor(model.manualTimeMinutes / 60)}h ${model.manualTimeMinutes % 60}m`
                        ) : (
                          <span className="text-slate-500 font-normal text-xs" title="Tempo de acabamento ou montagem">
                            -- <span className="text-[10px] text-slate-600 block">(opcional)</span>
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="bg-[#10161f] border border-[#1b2635] p-3 rounded-lg">
                      <span className="text-[10px] font-mono text-slate-400 uppercase block">
                        Triângulos (Malha)
                      </span>
                      <span className="text-sm font-mono font-bold text-purple-300 mt-0.5 block">
                        {trisCount ? (
                          `${trisCount.toLocaleString("pt-BR")} tris`
                        ) : (
                          <span className="text-slate-500 font-normal text-xs">
                            -- <span className="text-[10px] text-slate-600 block">(carregue 3D)</span>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bed Compatibility & Printer Hardware Match */}
                <div className="bg-[#0f151d] border border-[#1a2533] p-3.5 rounded-xl space-y-2.5">
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
                  <p className="text-xs text-slate-400 leading-relaxed">
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
                    <div className="flex gap-2 pt-1 text-[11px] font-mono flex-wrap">
                      <span className={`px-2 py-0.5 rounded border ${isBambuCompatible ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-[#16202c] text-slate-500 border-[#243344]"}`}>
                        Bambu X1C (256mm)
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${isVoronCompatible || isBambuCompatible ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-[#16202c] text-slate-500 border-[#243344]"}`}>
                        Voron 2.4 (300mm)
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${isVoronCompatible || isBambuCompatible ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/40" : "bg-[#16202c] text-slate-500 border-[#243344]"}`}>
                        Creality K1 Max
                      </span>
                    </div>
                  )}
                </div>

                {/* Material & Temperature Specs */}
                <div className="bg-[#0f151d] border border-[#1a2533] p-3.5 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Filamento Recomendado</span>
                    <span className="text-white font-medium">{filamentType || "--"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Preenchimento (Infill)</span>
                    <span className="text-cyan-300 font-mono">
                      {infillDensity ? `${infillDensity}% Gyroid/Grid` : "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bico (Nozzle)</span>
                    <span className="text-white font-mono">
                      {nozzleSize ? `${nozzleSize} mm` : "--"}
                    </span>
                  </div>
                </div>

                {/* Card: Valor de Venda Aproximado com atalho para o menu Notas */}
                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-slate-900/70 p-3.5 shadow-md space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Valor de Venda Aproximado
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                        Markup: {printerConfig.defaultMarkup ?? 100}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("notes")}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-300 text-[10px] font-semibold transition cursor-pointer"
                        title="Ir para a aba Notas para editar parâmetros de impressão"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        <span>Editar</span>
                      </button>
                    </div>
                  </div>

                  {approxBreakdown ? (
                    <>
                      <div className="flex items-baseline justify-between pt-0.5">
                        <div>
                          <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                            {formatBRL(approxBreakdown.suggestedPrice)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">preço sugerido</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-semibold text-emerald-300">
                            +{formatBRL(approxBreakdown.simulatedProfit)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">lucro estimado</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                          <span className="text-slate-400 text-[10px] block">Custo Total</span>
                          <span className="font-mono font-medium text-slate-200">
                            {formatBRL(approxBreakdown.totalCost)}
                          </span>
                        </div>
                        <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                          <span className="text-slate-400 text-[10px] block truncate" title={`Material (${selectedMaterial?.name || filamentType || model.filamentType || "PLA"})`}>
                            Mat. ({selectedMaterial?.name || filamentType || model.filamentType || "PLA"})
                          </span>
                          <span className="font-mono font-medium text-slate-200">
                            {formatBRL(approxBreakdown.materialCost)}
                          </span>
                        </div>
                        <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                          <span className="text-slate-400 text-[10px] block truncate" title="Máquina & Mão de Obra">
                            Máq. + Mão Obra
                          </span>
                          <span className="font-mono font-medium text-slate-200">
                            {formatBRL(approxBreakdown.energyCost + approxBreakdown.depreciationCost + approxBreakdown.laborCost)}
                          </span>
                        </div>
                      </div>

                      {/* Aviso indicando que para editar deve acessar o menu NOTAS */}
                      <div className="pt-1.5 flex items-center justify-between text-[11px] text-slate-400 border-t border-white/5">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <span className="text-cyan-400">💡</span>
                          <span>Para editar peso, tempo ou material:</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("notes")}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer transition"
                        >
                          <span>Acessar menu Notas</span>
                          <span>→</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="py-2.5 px-3 rounded-lg bg-black/20 border border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          Sem peso ou tempo de impressão definidos.
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-500">R$ 0,00</span>
                      </div>
                      <div className="pt-1 border-t border-white/5 flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Deseja calcular o valor aproximado?</span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("notes")}
                          className="text-cyan-400 hover:text-cyan-300 font-semibold underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Preencher no menu Notas</span>
                          <span>→</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Dispatch to Printer and Budget Buttons */}
                <div className="pt-1 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleGoToPricing}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Calcular Orçamento Completo</span>
                  </button>
                  {primaryFile && (
                    <a
                      href={`/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                        primaryFile.relativePath
                      )}&download=true`}
                      download={primaryFile.fileName}
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-[0.99] transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Baixar Arquivo ({primaryFile.fileName})</span>
                    </a>
                  )}
                </div>
              </>
            )}

            {activeTab === "notes" && (
              <div className="space-y-4 text-xs">
                {/* Linha 1: Bico | Infill | Camada */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Bico (mm)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={nozzleSize}
                      onChange={(e) => setNozzleSize(e.target.value)}
                      placeholder="0.4"
                      className="w-full px-3 py-2 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Infill (%)</label>
                    <input
                      type="number"
                      value={infillDensity}
                      onChange={(e) => setInfillDensity(e.target.value)}
                      placeholder="15"
                      className="w-full px-3 py-2 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Camada (mm)</label>
                    <input
                      type="number"
                      step="0.04"
                      value={layerHeight}
                      onChange={(e) => setLayerHeight(e.target.value)}
                      placeholder="0.2"
                      className="w-full px-3 py-2 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Linha 2: Filamento | Peso da Peça */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium">Filamento</label>
                    <input
                      type="text"
                      list="studio-filaments-list"
                      value={filamentType}
                      onChange={(e) => setFilamentType(e.target.value)}
                      placeholder="Ex: PLA, PETG, ABS"
                      className="w-full px-3 py-2 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                    />
                    <datalist id="studio-filaments-list">
                      {materialsList.map((m) => (
                        <option key={m.id || m.name} value={m.name}>
                          {m.name} ({formatBRL(m.costPerKg)}/kg)
                        </option>
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-400 font-medium flex items-center justify-between">
                      <span>Peso da Peça (g)</span>
                      {estimatedGrams && !weightGrams && (
                        <button
                          type="button"
                          onClick={() => setWeightGrams(estimatedGrams.toString())}
                          className="text-[10px] text-cyan-400 hover:underline cursor-pointer"
                          title="Preencher com peso estimado pela malha 3D"
                        >
                          Usar {estimatedGrams}g
                        </button>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={weightGrams}
                      onChange={(e) => setWeightGrams(e.target.value)}
                      placeholder={estimatedGrams ? `Ex: ${estimatedGrams}` : "Ex: 85"}
                      className="w-full px-3 py-2 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Linha 3: Tempo de Impressão */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span>Tempo de Impressão</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={printHours}
                        onChange={(e) => setPrintHours(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 pr-8 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 pointer-events-none">h</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={printMinutes}
                        onChange={(e) => setPrintMinutes(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 pr-8 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 pointer-events-none">min</span>
                    </div>
                  </div>
                </div>

                {/* Linha 4: Trabalho Manual */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Trabalho Manual</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        value={manualHours}
                        onChange={(e) => setManualHours(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 pr-8 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 pointer-events-none">h</span>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={manualMinutes}
                        onChange={(e) => setManualMinutes(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 pr-8 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                      />
                      <span className="absolute right-3 top-2 text-slate-500 pointer-events-none">min</span>
                    </div>
                  </div>
                </div>

                {/* Linha 5: Notas */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-medium">Notas</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções de fatiamento, temperaturas de bico/mesa, suportes recomendados..."
                    className="w-full px-3 py-2 rounded-lg bg-[#141e2a] border border-[#203042] text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Linha 6: Valor de Venda Aproximado */}
                <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-emerald-900/10 to-slate-900/70 p-3.5 shadow-md space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        Valor de Venda Aproximado
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                      Markup: {printerConfig.defaultMarkup ?? 100}%
                    </span>
                  </div>

                  {approxBreakdown ? (
                    <>
                      <div className="flex items-baseline justify-between pt-0.5">
                        <div>
                          <span className="text-2xl font-black font-mono text-emerald-400 tracking-tight">
                            {formatBRL(approxBreakdown.suggestedPrice)}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">preço sugerido</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-semibold text-emerald-300">
                            +{formatBRL(approxBreakdown.simulatedProfit)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">lucro estimado</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-emerald-500/20 grid grid-cols-3 gap-2 text-[11px]">
                        <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                          <span className="text-slate-400 text-[10px] block">Custo Total</span>
                          <span className="font-mono font-medium text-slate-200">
                            {formatBRL(approxBreakdown.totalCost)}
                          </span>
                        </div>
                        <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                          <span className="text-slate-400 text-[10px] block truncate" title={`Material (${selectedMaterial?.name || filamentType || "PLA"})`}>
                            Mat. ({selectedMaterial?.name || filamentType || "PLA"})
                          </span>
                          <span className="font-mono font-medium text-slate-200">
                            {formatBRL(approxBreakdown.materialCost)}
                          </span>
                        </div>
                        <div className="bg-black/30 rounded-lg p-1.5 border border-white/5">
                          <span className="text-slate-400 text-[10px] block truncate" title="Máquina & Mão de Obra">
                            Máq. + Mão Obra
                          </span>
                          <span className="font-mono font-medium text-slate-200">
                            {formatBRL(approxBreakdown.energyCost + approxBreakdown.depreciationCost + approxBreakdown.laborCost)}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-2 px-3 rounded-lg bg-black/20 border border-white/5 flex items-center justify-between">
                      <div className="text-[11px] text-slate-400">
                        Preencha o peso e tempo para calcular a estimativa.
                      </div>
                      <span className="text-sm font-mono font-bold text-slate-500">R$ 0,00</span>
                    </div>
                  )}
                </div>

                {/* Botões de Ação */}
                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    onClick={handleSaveNotes}
                    disabled={savingNotes}
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/20 transition disabled:opacity-50 cursor-pointer"
                  >
                    {savingNotes ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : notesSaved ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Salvo!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Salvar</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleGoToPricing}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Calcular Orçamento Completo</span>
                  </button>
                </div>
              </div>
            )}

            {activeTab === "manuals" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300">
                    Documentos e PDFs Anexos ({manualAssets.length})
                  </span>
                  <div>
                    <input
                      ref={manualInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleManualUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => manualInputRef.current?.click()}
                      disabled={uploadingManual}
                      className="px-3 py-1.5 rounded-lg bg-[#141e2a] hover:bg-[#1c2a3b] border border-[#203042] text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition disabled:opacity-50"
                    >
                      {uploadingManual ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      <span>Anexar PDF</span>
                    </button>
                  </div>
                </div>

                {manualAssets.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-[#10161f] border border-[#1a2533] text-slate-500 text-xs">
                    Nenhum manual anexado a este modelo.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {manualAssets.map((m) => {
                      const manualUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                        m.relativePath
                      )}`;
                      return (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-[#10161f] border border-[#1b2635] text-xs"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                            <span className="text-slate-200 truncate">{m.fileName}</span>
                            <span className="text-[10px] text-slate-500 font-mono shrink-0">
                              ({formatBytes(m.fileSize)})
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={manualUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 rounded-lg hover:bg-white/10 text-cyan-400 transition"
                              title="Abrir PDF"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <a
                              href={`${manualUrl}&download=true`}
                              download={m.fileName}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
                              title="Baixar Manual PDF"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteManual(m.id)}
                              disabled={deletingManualId === m.id}
                              className="p-1.5 rounded-lg hover:bg-white/10 text-rose-400 transition disabled:opacity-50"
                              title="Excluir Manual"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Panel Footer with Quick Status */}
          <div className="p-4 border-t border-[#182332] bg-[#090d12] flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>Última sincronização: {updatedDateStr}</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Verificado
            </span>
          </div>
        </aside>
        {/* END: RightDetailsPanel */}
      </main>
      {/* END: WorkspaceContainer */}

      {/* Cover Selector Modal */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#0d141e] border border-[#1f2d3d] p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-cyan-400" />
                <span>Trocar Imagem de Capa</span>
              </h3>
              <button
                onClick={() => setShowCoverModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Você pode fazer upload de uma foto do projeto impresso ou usar o botão &quot;Capa 3D&quot; no topo da visualização para capturar uma renderização em tempo real.
            </p>

            <div className="space-y-3">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverUpload}
                className="hidden"
              />
              <button
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {uploadingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span>Fazer Upload de Nova Foto</span>
              </button>

              {imageAssets.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1a2533]">
                  <span className="text-[11px] text-slate-400 font-medium block">
                    Ou selecione das imagens da pasta ({imageAssets.length}):
                  </span>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {imageAssets.map((img) => {
                      const imgUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(
                        img.relativePath
                      )}`;
                      return (
                        <button
                          key={img.id}
                          onClick={async () => {
                            setUploadingCover(true);
                            try {
                              const res = await fetch(`/api/models/${model.id}/cover`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ coverUrl: imgUrl }),
                              });
                              if (res.ok) {
                                const data = await res.json();
                                setModel({ ...model, coverImage: data.coverImage });
                                setShowCoverModal(false);
                              }
                            } finally {
                              setUploadingCover(false);
                            }
                          }}
                          className="aspect-square rounded-lg border border-[#1f2d3d] overflow-hidden hover:border-cyan-400 transition relative"
                        >
                          <img
                            src={imgUrl}
                            alt={img.fileName}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
