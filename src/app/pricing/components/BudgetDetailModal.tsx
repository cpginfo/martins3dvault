"use client";

import React from "react";
import { AccessoryItem, BudgetRecord } from "@/lib/pricing/types";
import { formatBRL, formatMinutes } from "@/lib/pricing/calculator";

interface BudgetDetailModalProps {
  budget: BudgetRecord | null;
  onClose: () => void;
  onDuplicate: (budget: BudgetRecord) => void;
}

export default function BudgetDetailModal({
  budget,
  onClose,
  onDuplicate,
}: BudgetDetailModalProps) {
  if (!budget) return null;

  const isSale = budget.isSale;
  const accessories: AccessoryItem[] = budget.accessories || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-container/20 text-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">description</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-on-surface">
                {budget.productName}
              </h3>
              <p className="text-xs text-on-surface-variant">
                {budget.customerName ? `Cliente: ${budget.customerName}` : "Cliente não informado"} • {new Date(budget.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSale ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Venda Concretizada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <span className="material-symbols-outlined text-sm">schedule</span>
                Orçamento
              </span>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Card Resumo de Valores */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-xs text-on-surface-variant block mb-1">Custo de Produção</span>
              <span className="text-base font-bold text-on-surface font-mono">
                {formatBRL(budget.totalCost)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-xs text-on-surface-variant block mb-1">Preço Sugerido</span>
              <span className="text-base font-bold text-primary-container font-mono">
                {formatBRL(budget.suggestedPrice)}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-xs text-on-surface-variant block mb-1">
                {isSale ? "Preço Real Vendido" : "Margem Simulada"}
              </span>
              <span className={`text-base font-bold font-mono ${isSale ? "text-emerald-600 dark:text-emerald-400" : "text-on-surface"}`}>
                {isSale ? formatBRL(budget.finalPrice || 0) : `${budget.markupPercent}%`}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/20">
              <span className="text-xs text-on-surface-variant block mb-1">
                {isSale ? "Lucro Real" : "Lucro Simulado"}
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBRL(isSale ? budget.actualProfit || 0 : budget.simulatedProfit)}
              </span>
            </div>
          </div>

          {/* Se foi venda com diferença de preço */}
          {isSale && budget.priceDifference !== null && budget.priceDifference !== undefined && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between ${
              budget.priceDifference >= 0
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">
                  {budget.priceDifference >= 0 ? "trending_up" : "trending_down"}
                </span>
                <span>
                  {budget.priceDifference >= 0
                    ? `Acréscimo de ${formatBRL(budget.priceDifference)} vs. preço simulado`
                    : `Desconto aplicado de ${formatBRL(Math.abs(budget.priceDifference))} vs. preço simulado`}
                </span>
              </div>
              <span className="text-xs font-mono font-bold">
                Simulado: {formatBRL(budget.suggestedPrice)} ➔ Real: {formatBRL(budget.finalPrice || 0)}
              </span>
            </div>
          )}

          {/* Especificações Técnicas */}
          <div>
            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Especificações Técnicas da Impressão
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="text-xs text-on-surface-variant block">Material Utilizado</span>
                <span className="font-medium text-on-surface">{budget.materialName}</span>
                <span className="text-[11px] text-on-surface-variant block">
                  {formatBRL(budget.materialCostPerKg)} / kg
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="text-xs text-on-surface-variant block">Tempo de Impressão</span>
                <span className="font-medium text-on-surface">{formatMinutes(budget.printTimeMinutes)}</span>
                <span className="text-[11px] text-on-surface-variant block">
                  {budget.printTimeMinutes} min total
                </span>
              </div>
              <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                <span className="text-xs text-on-surface-variant block">Peso da Peça</span>
                <span className="font-medium text-on-surface">{budget.weightGrams} g</span>
                <span className="text-[11px] text-on-surface-variant block">
                  {formatBRL((budget.materialCostPerKg / 1000) * budget.weightGrams)} em filamento
                </span>
              </div>
              {(budget.modelingTimeMinutes > 0 || budget.assemblyTimeMinutes > 0) && (
                <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20 col-span-2 sm:col-span-3">
                  <span className="text-xs text-on-surface-variant block">Trabalho Manual & Acabamento</span>
                  <span className="font-medium text-on-surface">
                    Modelagem: {formatMinutes(budget.modelingTimeMinutes)} • Montagem: {formatMinutes(budget.assemblyTimeMinutes)}
                  </span>
                  <span className="text-[11px] text-on-surface-variant block">
                    Total: {formatMinutes(budget.modelingTimeMinutes + budget.assemblyTimeMinutes)} ({formatBRL(budget.laborCost)})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Detalhado */}
          <div>
            <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Composição Analítica de Custos
            </h4>
            <div className="space-y-2 border border-outline-variant/20 rounded-xl p-4 bg-surface-container-low">
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-amber-500">bolt</span>
                  Energia Elétrica ({budget.powerWatts}W @ {formatBRL(budget.electricityKwhCost)}/kWh)
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(budget.energyCost)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-blue-500">settings</span>
                  Desgaste & Depreciação da Máquina
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(budget.depreciationCost)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-emerald-500">category</span>
                  Matéria Prima ({budget.materialName} - {budget.weightGrams}g)
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(budget.materialCost)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-purple-500">handyman</span>
                  Mão de Obra ({formatBRL(budget.manualHourlyRate)}/h)
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(budget.laborCost)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-outline-variant/10">
                <span className="text-on-surface-variant flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-rose-500">extension</span>
                  Acessórios & Insumos Extras
                </span>
                <span className="font-mono font-medium text-on-surface">{formatBRL(budget.accessoriesCost)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 font-bold text-base">
                <span className="text-on-surface">Custo Total de Produção</span>
                <span className="font-mono text-primary-container">{formatBRL(budget.totalCost)}</span>
              </div>
            </div>
          </div>

          {/* Acessórios vinculados */}
          {accessories.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
                Acessórios & Adicionais ({accessories.length})
              </h4>
              <div className="border border-outline-variant/20 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-container-high text-on-surface-variant">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qtd</th>
                      <th className="p-2.5 text-right">Valor Unit.</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/15">
                    {accessories.map((acc, idx) => (
                      <tr key={idx} className="hover:bg-surface-container/50">
                        <td className="p-2.5 font-medium text-on-surface">{acc.name}</td>
                        <td className="p-2.5 text-center">{acc.quantity}</td>
                        <td className="p-2.5 text-right font-mono">{formatBRL(acc.unitPrice)}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-on-surface">
                          {formatBRL(acc.unitPrice * acc.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Observações */}
          {budget.notes && (
            <div>
              <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Observações
              </h4>
              <p className="p-3 rounded-lg bg-surface-container text-xs text-on-surface whitespace-pre-wrap">
                {budget.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-between">
          <button
            onClick={() => {
              onDuplicate(budget);
              onClose();
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 transition-colors"
          >
            <span className="material-symbols-outlined text-base">content_copy</span>
            Duplicar / Reutilizar Orçamento
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-primary-container text-on-primary hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
