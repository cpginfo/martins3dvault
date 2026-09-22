"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  PrinterConfig,
  MaterialConfig,
  AccessoryItem,
  BudgetCalculationInput,
} from "@/lib/pricing/types";
import {
  calculatePrintCost,
  formatBRL,
  formatMinutes,
} from "@/lib/pricing/calculator";

interface CalculatorTabProps {
  printerConfig: PrinterConfig;
  materials: MaterialConfig[];
  initialData?: BudgetCalculationInput | null;
  onBudgetSaved: () => void;
  onOpenNewMaterialModal: () => void;
}

export default function CalculatorTab({
  printerConfig,
  materials,
  initialData,
  onBudgetSaved,
  onOpenNewMaterialModal,
}: CalculatorTabProps) {
  // Form state
  const [productName, setProductName] = useState(initialData?.productName || "");
  const [customerName, setCustomerName] = useState(initialData?.customerName || "");
  const [printTimeHours, setPrintTimeHours] = useState<number | string>(
    initialData?.printTimeHours !== undefined ? initialData.printTimeHours : 3
  );
  const [printTimeMinutes, setPrintTimeMinutes] = useState<number | string>(
    initialData?.printTimeMinutes !== undefined ? initialData.printTimeMinutes : 30
  );
  const [weightGrams, setWeightGrams] = useState<number | string>(
    initialData?.weightGrams !== undefined ? initialData.weightGrams : 85
  );

  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("");
  const [materialCostPerKg, setMaterialCostPerKg] = useState<number | string>(110);
  const [materialName, setMaterialName] = useState<string>("PLA Standard");

  const [modelingTimeHours, setModelingTimeHours] = useState<number | string>(
    initialData?.modelingTimeHours !== undefined ? initialData.modelingTimeHours : 0
  );
  const [modelingTimeMinutes, setModelingTimeMinutes] = useState<number | string>(
    initialData?.modelingTimeMinutes !== undefined ? initialData.modelingTimeMinutes : 0
  );
  const [assemblyTimeHours, setAssemblyTimeHours] = useState<number | string>(
    initialData?.assemblyTimeHours !== undefined ? initialData.assemblyTimeHours : 0
  );
  const [assemblyTimeMinutes, setAssemblyTimeMinutes] = useState<number | string>(
    initialData?.assemblyTimeMinutes !== undefined ? initialData.assemblyTimeMinutes : 0
  );

  const [markupPercent, setMarkupPercent] = useState<number | string>(
    initialData?.markupPercent !== undefined ? initialData.markupPercent : printerConfig.defaultMarkup || 100
  );

  const [accessories, setAccessories] = useState<AccessoryItem[]>(
    initialData?.accessories ? JSON.parse(JSON.stringify(initialData.accessories)) : []
  );

  // Venda
  const [isSale, setIsSale] = useState(Boolean(initialData?.isSale));
  const [finalPrice, setFinalPrice] = useState<string>(
    initialData?.finalPrice !== undefined && initialData?.finalPrice !== null
      ? String(initialData.finalPrice)
      : ""
  );
  const [notes, setNotes] = useState("");

  // Submissão & feedback
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Inicializa material se a lista estiver carregada
  useEffect(() => {
    if (materials.length > 0 && !selectedMaterialId) {
      const defaultMat = materials[0];
      const timer = setTimeout(() => {
        setSelectedMaterialId(defaultMat.id || "");
        setMaterialCostPerKg(defaultMat.costPerKg);
        setMaterialName(defaultMat.name);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [materials, selectedMaterialId]);

  // Se initialData for injetado (ex: duplicar orçamento)
  useEffect(() => {
    if (initialData) {
      const timer = setTimeout(() => {
        setProductName(initialData.productName || "");
        setCustomerName(initialData.customerName || "");
        setPrintTimeHours(initialData.printTimeHours || 0);
        setPrintTimeMinutes(initialData.printTimeMinutes || 0);
        setWeightGrams(initialData.weightGrams || 0);
        setMaterialCostPerKg(initialData.materialCostPerKg || 110);
        setMaterialName(initialData.materialName || "Material");
        if (initialData.materialId) setSelectedMaterialId(initialData.materialId);
        setModelingTimeHours(initialData.modelingTimeHours || 0);
        setModelingTimeMinutes(initialData.modelingTimeMinutes || 0);
        setAssemblyTimeHours(initialData.assemblyTimeHours || 0);
        setAssemblyTimeMinutes(initialData.assemblyTimeMinutes || 0);
        setMarkupPercent(initialData.markupPercent || 100);
        setAccessories(initialData.accessories ? JSON.parse(JSON.stringify(initialData.accessories)) : []);
        setIsSale(Boolean(initialData.isSale));
        setFinalPrice(initialData.finalPrice ? String(initialData.finalPrice) : "");
        setFeedback({
          type: "success",
          message: "Dados de orçamento importados com sucesso! Ajuste os valores e salve como novo orçamento.",
        });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [initialData]);

  // Atualiza material selecionado
  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    const found = materials.find((m) => m.id === matId);
    if (found) {
      setMaterialCostPerKg(found.costPerKg);
      setMaterialName(found.name);
    }
  };

  // Acessórios
  const addAccessory = () => {
    setAccessories((prev) => [
      ...prev,
      { name: "Novo Item (Ex: Parafuso M3 / Ímã / LED)", unitPrice: 2.5, quantity: 1 },
    ]);
  };

  const updateAccessory = (index: number, field: keyof AccessoryItem, value: string | number) => {
    setAccessories((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeAccessory = (index: number) => {
    setAccessories((prev) => prev.filter((_, i) => i !== index));
  };

  // Cálculo determinístico em tempo real
  const breakdown = useMemo(() => {
    const input: BudgetCalculationInput = {
      productName: productName || "Peça 3D",
      customerName,
      printTimeHours: Number(printTimeHours) || 0,
      printTimeMinutes: Number(printTimeMinutes) || 0,
      weightGrams: Number(weightGrams) || 0,
      materialCostPerKg: Number(materialCostPerKg) || 0,
      modelingTimeHours: Number(modelingTimeHours) || 0,
      modelingTimeMinutes: Number(modelingTimeMinutes) || 0,
      assemblyTimeHours: Number(assemblyTimeHours) || 0,
      assemblyTimeMinutes: Number(assemblyTimeMinutes) || 0,
      markupPercent: Number(markupPercent) || 0,
      accessories,
      isSale,
      finalPrice: isSale && finalPrice !== "" ? Number(finalPrice) : null,
    };
    return calculatePrintCost(input, printerConfig);
  }, [
    productName,
    customerName,
    printTimeHours,
    printTimeMinutes,
    weightGrams,
    materialCostPerKg,
    modelingTimeHours,
    modelingTimeMinutes,
    assemblyTimeHours,
    assemblyTimeMinutes,
    markupPercent,
    accessories,
    isSale,
    finalPrice,
    printerConfig,
  ]);

  // Se marcar como venda e finalPrice estiver vazio, sugere o preço calculado
  useEffect(() => {
    if (isSale && (!finalPrice || finalPrice === "0")) {
      const timer = setTimeout(() => {
        setFinalPrice(String(breakdown.suggestedPrice));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isSale, breakdown.suggestedPrice, finalPrice]);

  const handleClear = () => {
    setProductName("");
    setCustomerName("");
    setPrintTimeHours(2);
    setPrintTimeMinutes(0);
    setWeightGrams(50);
    setModelingTimeHours(0);
    setModelingTimeMinutes(0);
    setAssemblyTimeHours(0);
    setAssemblyTimeMinutes(0);
    setMarkupPercent(printerConfig.defaultMarkup || 100);
    setAccessories([]);
    setIsSale(false);
    setFinalPrice("");
    setNotes("");
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productName.trim()) {
      setFeedback({ type: "error", message: "Informe o nome do produto/peça." });
      return;
    }
    const totalPrintMinutes = Number(printTimeHours) * 60 + Number(printTimeMinutes);
    if (totalPrintMinutes <= 0) {
      setFeedback({ type: "error", message: "Informe o tempo de impressão maior que zero." });
      return;
    }
    if (Number(weightGrams) <= 0) {
      setFeedback({ type: "error", message: "O peso da peça deve ser maior que zero." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const payload = {
        productName: productName.trim(),
        customerName: customerName.trim() || null,
        printTimeHours: Number(printTimeHours) || 0,
        printTimeMinutes: Number(printTimeMinutes) || 0,
        weightGrams: Number(weightGrams) || 0,
        materialId: selectedMaterialId || null,
        materialName,
        materialCostPerKg: Number(materialCostPerKg) || 0,
        modelingTimeHours: Number(modelingTimeHours) || 0,
        modelingTimeMinutes: Number(modelingTimeMinutes) || 0,
        assemblyTimeHours: Number(assemblyTimeHours) || 0,
        assemblyTimeMinutes: Number(assemblyTimeMinutes) || 0,
        markupPercent: Number(markupPercent) || 0,
        accessories,
        isSale,
        finalPrice: isSale ? (finalPrice ? Number(finalPrice) : breakdown.suggestedPrice) : null,
        notes: notes.trim() || null,
      };

      const res = await fetch("/api/pricing/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao salvar orçamento.");
      }

      setFeedback({
        type: "success",
        message: isSale
          ? "🎉 Venda registrada com sucesso e contabilizada no Dashboard!"
          : "✅ Orçamento salvo com sucesso na listagem!",
      });

      onBudgetSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro de conexão.";
      setFeedback({ type: "error", message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      {/* Coluna 1: Formulário de Entrada (7 colunas) */}
      <div className="lg:col-span-7 space-y-6">
        <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm space-y-5">
          {feedback && (
            <div
              className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
                feedback.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base">
                  {feedback.type === "success" ? "check_circle" : "error"}
                </span>
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs hover:opacity-70"
              >
                ✕
              </button>
            </div>
          )}

          {/* Cabeçalho da Seção */}
          <div className="flex items-center justify-between pb-4 border-b border-outline-variant/15">
            <div>
              <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-xl">
                  calculate
                </span>
                Calculadora & Novo Orçamento
              </h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Preencha os parâmetros de fatiamento e pós-processamento da peça
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1 py-1 px-2.5 rounded-lg hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Limpar
            </button>
          </div>

          {/* Linha 1: Produto e Cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Nome da Peça / Produto *
              </label>
              <input
                type="text"
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Ex: Suporte de Headset RGB, Vaso Voronoi..."
                className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Nome do Cliente (Opcional)
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">
                  person
                </span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Studio Tech, Mariana Lima..."
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Linha 2: Material e Peso */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-on-surface-variant">
                  Material de Impressão *
                </label>
                <button
                  type="button"
                  onClick={onOpenNewMaterialModal}
                  className="text-[11px] text-primary-container hover:underline flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-xs">add</span>
                  Novo Material
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedMaterialId}
                  onChange={(e) => handleMaterialChange(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
                >
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({formatBRL(m.costPerKg)}/kg)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1">
                Peso da Peça (gramas) *
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-on-surface-variant">
                  gramas
                </span>
              </div>
            </div>
          </div>

          {/* Linha 3: Tempo de Impressão */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Tempo de Impressão (Fatiador) *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={printTimeHours}
                  onChange={(e) => setPrintTimeHours(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
                  horas
                </span>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={printTimeMinutes}
                  onChange={(e) => setPrintTimeMinutes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">
                  minutos
                </span>
              </div>
            </div>
          </div>

          {/* Linha 4: Trabalho Manual (Modelagem + Montagem) */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 space-y-3">
            <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary-container">
                handyman
              </span>
              Trabalho Manual & Pós-Processamento (Opcional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] text-on-surface-variant block mb-1">
                  Modelagem / Adaptação 3D:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0 h"
                    value={modelingTimeHours}
                    onChange={(e) => setModelingTimeHours(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-on-surface"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0 min"
                    value={modelingTimeMinutes}
                    onChange={(e) => setModelingTimeMinutes(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-on-surface"
                  />
                </div>
              </div>

              <div>
                <span className="text-[11px] text-on-surface-variant block mb-1">
                  Montagem, Lixamento & Pintura:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="0 h"
                    value={assemblyTimeHours}
                    onChange={(e) => setAssemblyTimeHours(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-on-surface"
                  />
                  <input
                    type="number"
                    min="0"
                    max="59"
                    placeholder="0 min"
                    value={assemblyTimeMinutes}
                    onChange={(e) => setAssemblyTimeMinutes(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-surface-container-low border border-outline-variant/30 text-xs font-mono text-on-surface"
                  />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Taxa horária manual configurada: <span className="font-mono font-medium">{formatBRL(printerConfig.manualHourlyRate)}/h</span>
            </p>
          </div>

          {/* Linha 5: MarkUp Comercial */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-on-surface-variant">
                MarkUp Comercial (% sobre o custo total)
              </label>
              <button
                type="button"
                onClick={() => setMarkupPercent(printerConfig.defaultMarkup || 100)}
                className="text-[11px] text-primary-container hover:underline"
              >
                Padrão ({printerConfig.defaultMarkup || 100}%)
              </button>
            </div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="400"
                step="5"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(e.target.value)}
                className="w-full accent-primary-container cursor-pointer"
              />
              <div className="relative w-28 flex-shrink-0">
                <input
                  type="number"
                  min="0"
                  value={markupPercent}
                  onChange={(e) => setMarkupPercent(e.target.value)}
                  className="w-full pl-3 pr-7 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono font-bold text-right focus:outline-none focus:border-primary-container"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Seção: Acessórios & Insumos Extras */}
          <div className="p-4 rounded-xl border border-outline-variant/25 bg-surface-container-low space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-rose-500">extension</span>
                Acessórios & Insumos Extras ({accessories.length})
              </span>
              <button
                type="button"
                onClick={addAccessory}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary-container hover:underline"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Adicionar Item
              </button>
            </div>

            {accessories.length === 0 ? (
              <p className="text-xs text-on-surface-variant italic py-1">
                Nenhum acessório adicional incluído (ex: fita LED, ímãs, parafusos, chaveiros, embalagens).
              </p>
            ) : (
              <div className="space-y-2">
                {accessories.map((acc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-lowest border border-outline-variant/20 text-xs"
                  >
                    <input
                      type="text"
                      placeholder="Nome do insumo"
                      value={acc.name}
                      onChange={(e) => updateAccessory(idx, "name", e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-md bg-surface-container border border-outline-variant/20 text-on-surface"
                    />
                    <div className="w-16">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qtd"
                        value={acc.quantity}
                        onChange={(e) => updateAccessory(idx, "quantity", Number(e.target.value) || 1)}
                        className="w-full px-2 py-1.5 rounded-md bg-surface-container border border-outline-variant/20 text-on-surface text-center font-mono"
                      />
                    </div>
                    <div className="w-24 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-on-surface-variant font-mono">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={acc.unitPrice}
                        onChange={(e) => updateAccessory(idx, "unitPrice", Number(e.target.value) || 0)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-md bg-surface-container border border-outline-variant/20 text-on-surface text-right font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAccessory(idx)}
                      className="p-1.5 text-on-surface-variant hover:text-red-500 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Remover acessório"
                    >
                      <span className="material-symbols-outlined text-base">delete</span>
                    </button>
                  </div>
                ))}
                <div className="text-right text-xs font-mono text-on-surface font-semibold pt-1">
                  Subtotal Acessórios: {formatBRL(breakdown.accessoriesCost)}
                </div>
              </div>
            )}
          </div>

          {/* Seção: Marcar como Venda */}
          <div className="p-4 rounded-xl border border-outline-variant/25 bg-surface-container space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-500">
                    point_of_sale
                  </span>
                  Marcar Diretamente como Venda Efetiva
                </span>
                <span className="text-[11px] text-on-surface-variant block mt-0.5">
                  Se marcado, este orçamento contabiliza nas métricas do Dashboard
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSale}
                  onChange={(e) => setIsSale(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-container-lowest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {isSale && (
              <div className="pt-2 border-t border-outline-variant/20 space-y-2 animate-fadeIn">
                <label className="block text-xs font-semibold text-on-surface-variant">
                  Preço Real Vendido (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-on-surface-variant text-sm">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={finalPrice}
                    onChange={(e) => setFinalPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono font-bold text-base focus:outline-none focus:border-primary-container"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Pode ser ajustado com desconto ou acréscimo em relação ao sugerido ({formatBRL(breakdown.suggestedPrice)}).
                </p>
              </div>
            )}
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant mb-1">
              Observações / Instruções Internas
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Fatiado em 0.20mm com 15% gyroid infill. Cliente retirará no local."
              className="w-full px-3.5 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-xs focus:outline-none focus:border-primary-container"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancelar / Limpar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-primary-container text-on-primary hover:opacity-90 transition-all shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  Gravando...
                </>
              ) : isSale ? (
                <>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Salvar Venda Real
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  Salvar Orçamento
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Coluna 2: Live Breakdown em Tempo Real (5 colunas) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Card Destaque: Preço de Venda & Lucratividade */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm space-y-5 sticky top-24">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Resultado Simulado
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-primary-container/15 text-primary-container border border-primary-container/30">
              +{markupPercent}% MarkUp
            </span>
          </div>

          {/* Preço Principal */}
          <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 text-center space-y-1">
            <span className="text-xs text-on-surface-variant font-medium">
              Preço de Venda Recomendado
            </span>
            <div className="text-3xl font-extrabold text-primary-container font-mono tracking-tight">
              {formatBRL(breakdown.suggestedPrice)}
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              Margem de Lucro: <span className="font-mono font-bold">{formatBRL(breakdown.simulatedProfit)}</span> ({breakdown.simulatedMarginPercent}%)
            </div>
          </div>

          {/* Se marcada como venda */}
          {isSale && breakdown.finalPrice !== null && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-base">verified</span>
                  Venda Concretizada
                </span>
                <span className="font-mono font-bold text-base text-on-surface">
                  {formatBRL(breakdown.finalPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Lucro Líquido Real:</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {formatBRL(breakdown.actualProfit || 0)} ({breakdown.actualMarginPercent}%)
                </span>
              </div>
              {breakdown.priceDifference !== null && (
                <div className="flex items-center justify-between text-[11px]">
                  <span>Comparativo vs. Simulado:</span>
                  <span className={`font-mono font-semibold ${breakdown.priceDifference >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                    {breakdown.priceDifference >= 0
                      ? `+ ${formatBRL(breakdown.priceDifference)} (Acréscimo)`
                      : `- ${formatBRL(Math.abs(breakdown.priceDifference))} (Desconto)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Breakdown Detalhado dos Custos de Produção */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs font-bold text-on-surface">
              <span>Custo de Produção (Preço de Custo)</span>
              <span className="font-mono text-base">{formatBRL(breakdown.totalCost)}</span>
            </div>

            {/* Itens individuais */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  Energia Elétrica ({printerConfig.powerWatts}W)
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(breakdown.energyCost)}</span>
              </div>

              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  Depreciação Máquina ({printerConfig.lifespanHours}h)
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(breakdown.depreciationCost)}</span>
              </div>

              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Filamento / Resina ({weightGrams}g)
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(breakdown.materialCost)}</span>
              </div>

              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  Mão de Obra ({formatMinutes(breakdown.totalLaborTimeMinutes)})
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(breakdown.laborCost)}</span>
              </div>

              <div className="flex justify-between items-center text-on-surface-variant">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  Acessórios & Extras ({accessories.length})
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(breakdown.accessoriesCost)}</span>
              </div>
            </div>

            {/* Barra Visual Proporcional de Custos */}
            {breakdown.totalCost > 0 && (
              <div className="w-full h-2.5 rounded-full overflow-hidden bg-surface-container flex mt-3">
                <div
                  style={{ width: `${(breakdown.energyCost / breakdown.totalCost) * 100}%` }}
                  className="bg-amber-500 h-full"
                  title={`Energia: ${formatBRL(breakdown.energyCost)}`}
                />
                <div
                  style={{ width: `${(breakdown.depreciationCost / breakdown.totalCost) * 100}%` }}
                  className="bg-blue-500 h-full"
                  title={`Depreciação: ${formatBRL(breakdown.depreciationCost)}`}
                />
                <div
                  style={{ width: `${(breakdown.materialCost / breakdown.totalCost) * 100}%` }}
                  className="bg-emerald-500 h-full"
                  title={`Material: ${formatBRL(breakdown.materialCost)}`}
                />
                <div
                  style={{ width: `${(breakdown.laborCost / breakdown.totalCost) * 100}%` }}
                  className="bg-purple-500 h-full"
                  title={`Mão de Obra: ${formatBRL(breakdown.laborCost)}`}
                />
                <div
                  style={{ width: `${(breakdown.accessoriesCost / breakdown.totalCost) * 100}%` }}
                  className="bg-rose-500 h-full"
                  title={`Acessórios: ${formatBRL(breakdown.accessoriesCost)}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
