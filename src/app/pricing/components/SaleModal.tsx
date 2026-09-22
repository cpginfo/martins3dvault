"use client";

import React, { useState } from "react";
import { formatBRL } from "@/lib/pricing/calculator";
import { BudgetRecord } from "@/lib/pricing/types";

interface SaleModalProps {
  budget: BudgetRecord | null;
  onClose: () => void;
  onSave: (budgetId: string, isSale: boolean, finalPrice: number | null) => Promise<void>;
}

export default function SaleModal({ budget, onClose, onSave }: SaleModalProps) {
  const [isSale, setIsSale] = useState(budget?.isSale ?? false);
  const [finalPrice, setFinalPrice] = useState<string>(
    budget?.finalPrice !== null && budget?.finalPrice !== undefined
      ? String(budget.finalPrice)
      : String(budget?.suggestedPrice ?? "")
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!budget) return null;

  const numericFinal = parseFloat(finalPrice) || 0;
  const totalCost = budget.totalCost || 0;
  const suggestedPrice = budget.suggestedPrice || 0;

  const actualProfit = numericFinal - totalCost;
  const priceDiff = numericFinal - suggestedPrice;

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const priceToSave = isSale ? numericFinal : null;
      await onSave(budget.id, isSale, priceToSave);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro ao salvar status de venda.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-md bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-low">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-500 text-2xl">
              point_of_sale
            </span>
            <h3 className="text-base font-bold text-on-surface">
              {isSale ? "Registro de Venda Concretizada" : "Converter em Venda"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-sm">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="p-3 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-xs text-on-surface-variant block">Produto / Peça</span>
            <span className="font-semibold text-on-surface text-base">{budget.productName}</span>
            {budget.customerName && (
              <span className="text-xs text-on-surface-variant block mt-0.5">
                Cliente: {budget.customerName}
              </span>
            )}
          </div>

          {/* Toggle isSale */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container-high border border-outline-variant/20">
            <div>
              <span className="font-semibold text-on-surface block">Marcar como Venda</span>
              <span className="text-xs text-on-surface-variant">
                Contabiliza nos relatórios financeiros e dashboard
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
            <div className="space-y-3 animate-fadeIn">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1">
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
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface font-mono font-bold text-base focus:outline-none focus:border-primary-container"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  Preço sugerido original: <span className="font-mono font-medium">{formatBRL(suggestedPrice)}</span> (Custo: {formatBRL(totalCost)})
                </p>
              </div>

              {/* Comparativo em tempo real */}
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-xs">
                <div>
                  <span className="text-on-surface-variant block">Lucro Efetivo:</span>
                  <span className={`font-mono font-bold text-sm ${actualProfit >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {formatBRL(actualProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-on-surface-variant block">Diferença vs. Simulado:</span>
                  <span className={`font-mono font-bold text-sm ${priceDiff >= 0 ? "text-emerald-500" : "text-amber-500"}`}>
                    {priceDiff >= 0 ? `+ ${formatBRL(priceDiff)} (Acréscimo)` : `- ${formatBRL(Math.abs(priceDiff))} (Desconto)`}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-outline-variant/20 bg-surface-container-low flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary-container text-on-primary hover:opacity-90 transition-opacity disabled:opacity-50 shadow-md"
          >
            {saving ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Salvando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">save</span>
                Salvar Alterações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
