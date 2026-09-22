"use client";

import React, { useState } from "react";
import { PrinterConfig, MaterialConfig } from "@/lib/pricing/types";
import { formatBRL } from "@/lib/pricing/calculator";

interface SettingsTabProps {
  printerConfig: PrinterConfig;
  materials: MaterialConfig[];
  onSettingsUpdated: (newSettings: PrinterConfig) => void;
  onMaterialsUpdated: () => void;
}

export default function SettingsTab({
  printerConfig,
  materials,
  onSettingsUpdated,
  onMaterialsUpdated,
}: SettingsTabProps) {
  // Configurações
  const [printerName, setPrinterName] = useState(printerConfig.printerName || "Impressora 3D Principal");
  const [printerCost, setPrinterCost] = useState<number | string>(printerConfig.printerCost);
  const [powerWatts, setPowerWatts] = useState<number | string>(printerConfig.powerWatts);
  const [lifespanHours, setLifespanHours] = useState<number | string>(printerConfig.lifespanHours);
  const [electricityKwhCost, setElectricityKwhCost] = useState<number | string>(printerConfig.electricityKwhCost);
  const [manualHourlyRate, setManualHourlyRate] = useState<number | string>(printerConfig.manualHourlyRate);
  const [defaultMarkup, setDefaultMarkup] = useState<number | string>(printerConfig.defaultMarkup);

  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsFeedback, setSettingsFeedback] = useState<string | null>(null);

  // Cadastro de Material
  const [editingMaterial, setEditingMaterial] = useState<MaterialConfig | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [materialCost, setMaterialCost] = useState<number | string>("");
  const [materialDensity, setMaterialDensity] = useState<number | string>(1.24);
  const [savingMaterial, setSavingMaterial] = useState(false);
  const [materialFeedback, setMaterialFeedback] = useState<string | null>(null);

  // Cálculos derivados da máquina por hora
  const hourlyEnergy =
    ((Number(powerWatts) || 0) / 1000) * (Number(electricityKwhCost) || 0);
  const hourlyDepreciation =
    Number(lifespanHours) > 0 ? (Number(printerCost) || 0) / Number(lifespanHours) : 0;
  const machineHourlyTotal = hourlyEnergy + hourlyDepreciation;

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsFeedback(null);
    try {
      const res = await fetch("/api/pricing/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printerName,
          printerCost: Number(printerCost),
          powerWatts: Number(powerWatts),
          lifespanHours: Number(lifespanHours),
          electricityKwhCost: Number(electricityKwhCost),
          manualHourlyRate: Number(manualHourlyRate),
          defaultMarkup: Number(defaultMarkup),
        }),
      });
      if (!res.ok) throw new Error("Erro ao salvar configurações.");
      const updated = await res.json();
      onSettingsUpdated(updated);
      setSettingsFeedback("Configurações atualizadas com sucesso!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar.";
      setSettingsFeedback(message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialName.trim() || Number(materialCost) <= 0) return;

    setSavingMaterial(true);
    setMaterialFeedback(null);
    try {
      if (editingMaterial?.id) {
        // Update
        const res = await fetch(`/api/pricing/materials/${editingMaterial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: materialName.trim(),
            costPerKg: Number(materialCost),
            density: Number(materialDensity) || 1.24,
          }),
        });
        if (!res.ok) throw new Error("Erro ao atualizar material.");
      } else {
        // Create
        const res = await fetch("/api/pricing/materials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: materialName.trim(),
            costPerKg: Number(materialCost),
            density: Number(materialDensity) || 1.24,
          }),
        });
        if (!res.ok) throw new Error("Erro ao criar material.");
      }

      setMaterialName("");
      setMaterialCost("");
      setMaterialDensity(1.24);
      setEditingMaterial(null);
      setMaterialFeedback("Material salvo com sucesso!");
      onMaterialsUpdated();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar.";
      setMaterialFeedback(message);
    } finally {
      setSavingMaterial(false);
    }
  };

  const startEditMaterial = (m: MaterialConfig) => {
    setEditingMaterial(m);
    setMaterialName(m.name);
    setMaterialCost(m.costPerKg);
    setMaterialDensity(m.density || 1.24);
  };

  const cancelEditMaterial = () => {
    setEditingMaterial(null);
    setMaterialName("");
    setMaterialCost("");
    setMaterialDensity(1.24);
  };

  const handleDeleteMaterial = async (id: string, name: string) => {
    if (confirm(`Deseja excluir o material "${name}"?`)) {
      try {
        await fetch(`/api/pricing/materials/${id}`, { method: "DELETE" });
        onMaterialsUpdated();
      } catch (err) {
        console.error("Erro ao excluir material:", err);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
      {/* Coluna 1: Configurações da Impressora & Oficina (6 cols) */}
      <div className="lg:col-span-6 space-y-6">
        <form onSubmit={handleSaveSettings} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary-container text-xl">
                  precision_manufacturing
                </span>
                Configurações da Impressora & Oficina
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Custos base utilizados nos orçamentos e precificações
              </p>
            </div>
          </div>

          {settingsFeedback && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {settingsFeedback}
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-on-surface-variant mb-1">
                Identificação da Máquina
              </label>
              <input
                type="text"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Valor de Compra da Impressora (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={printerCost}
                  onChange={(e) => setPrinterCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Vida Útil Estimada (Horas)
                </label>
                <input
                  type="number"
                  min="1"
                  value={lifespanHours}
                  onChange={(e) => setLifespanHours(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Potência de Consumo (Watts)
                </label>
                <input
                  type="number"
                  min="0"
                  value={powerWatts}
                  onChange={(e) => setPowerWatts(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Custo de Energia (R$/kWh)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={electricityKwhCost}
                  onChange={(e) => setElectricityKwhCost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  Valor Hora de Trabalho Manual (R$/h)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={manualHourlyRate}
                  onChange={(e) => setManualHourlyRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block font-semibold text-on-surface-variant mb-1">
                  MarkUp Padrão Sugerido (%)
                </label>
                <input
                  type="number"
                  min="0"
                  value={defaultMarkup}
                  onChange={(e) => setDefaultMarkup(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm font-mono focus:outline-none focus:border-primary-container"
                />
              </div>
            </div>

            {/* Telemetria Derivada em Tempo Real */}
            <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block">
                Custos Operacionais Derivados por Hora de Impressão
              </span>
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 rounded-lg bg-surface-container-low">
                  <span className="text-[10px] text-on-surface-variant block">Energia/Hora</span>
                  <span className="font-mono font-bold text-on-surface">{formatBRL(hourlyEnergy)}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low">
                  <span className="text-[10px] text-on-surface-variant block">Depreciação/Hora</span>
                  <span className="font-mono font-bold text-on-surface">{formatBRL(hourlyDepreciation)}</span>
                </div>
                <div className="p-2 rounded-lg bg-surface-container-low border border-primary-container/30">
                  <span className="text-[10px] text-primary-container font-semibold block">Custo Máquina/h</span>
                  <span className="font-mono font-bold text-primary-container">{formatBRL(machineHourlyTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-primary-container text-on-primary hover:opacity-90 transition-opacity shadow-md disabled:opacity-50"
            >
              {savingSettings ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </form>
      </div>

      {/* Coluna 2: Cadastro & Gestão de Materiais (6 cols) */}
      <div className="lg:col-span-6 space-y-6">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
            <div>
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-500 text-xl">
                  category
                </span>
                Catálogo de Materiais & Filamentos
              </h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Materiais disponíveis para seleção rápida nos orçamentos
              </p>
            </div>
          </div>

          {/* Form Adicionar/Editar Material */}
          <form onSubmit={handleSaveMaterial} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/20 space-y-3">
            {materialFeedback && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
                {materialFeedback}
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface">
                {editingMaterial ? `Editar Material: ${editingMaterial.name}` : "Cadastrar Novo Material"}
              </span>
              {editingMaterial && (
                <button
                  type="button"
                  onClick={cancelEditMaterial}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                >
                  Cancelar Edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-0.5">
                  Nome do Material *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PLA Silk Bicolor, PETG Carbono..."
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface focus:outline-none focus:border-primary-container"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-on-surface-variant mb-0.5">
                  Custo por kg (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  required
                  placeholder="120.00"
                  value={materialCost}
                  onChange={(e) => setMaterialCost(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-surface-container-lowest border border-outline-variant/30 text-xs text-on-surface font-mono focus:outline-none focus:border-primary-container"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-on-surface-variant">
                {Number(materialCost) > 0 && (
                  <>Custo aprox.: <strong className="font-mono">{formatBRL(Number(materialCost) / 1000)} / grama</strong></>
                )}
              </span>
              <button
                type="submit"
                disabled={savingMaterial}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                {savingMaterial ? "Salvando..." : editingMaterial ? "Atualizar" : "+ Adicionar"}
              </button>
            </div>
          </form>

          {/* Tabela de Materiais */}
          <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-container-high text-on-surface-variant">
                <tr>
                  <th className="p-3">Material</th>
                  <th className="p-3 text-right">R$/kg</th>
                  <th className="p-3 text-right">R$/g</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/15">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="p-3 font-semibold text-on-surface">{m.name}</td>
                    <td className="p-3 text-right font-mono text-on-surface">
                      {formatBRL(m.costPerKg)}
                    </td>
                    <td className="p-3 text-right font-mono text-on-surface-variant">
                      {formatBRL(m.costPerKg / 1000)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => startEditMaterial(m)}
                          className="p-1 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                          title="Editar material"
                        >
                          <span className="material-symbols-outlined text-base">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m.id!, m.name)}
                          className="p-1 rounded-md text-on-surface-variant hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Excluir material"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
