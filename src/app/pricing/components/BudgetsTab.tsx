"use client";

import React, { useState, useMemo } from "react";
import { formatBRL, formatMinutes } from "@/lib/pricing/calculator";
import { BudgetRecord } from "@/lib/pricing/types";

interface BudgetsTabProps {
  budgets: BudgetRecord[];
  loading: boolean;
  onRefresh: () => void;
  onOpenImportModal: () => void;
  onDuplicate: (budget: BudgetRecord) => void;
  onOpenSaleModal: (budget: BudgetRecord) => void;
  onOpenDetailModal: (budget: BudgetRecord) => void;
  onDeleteBudget: (id: string) => Promise<void>;
}

export default function BudgetsTab({
  budgets,
  loading,
  onRefresh,
  onOpenImportModal,
  onDuplicate,
  onOpenSaleModal,
  onOpenDetailModal,
  onDeleteBudget,
}: BudgetsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "budgets" | "sales">("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportSales = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/pricing/export?type=sales");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Falha ao exportar vendas.");
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vendas_3d_vault_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erro desconhecido";
      alert(`Erro ao exportar vendas: ${message}`);
    } finally {
      setExporting(false);
    }
  };

  // Filtragem local imediata
  const filteredBudgets = useMemo(() => {
    return budgets.filter((b) => {
      if (filterType === "budgets" && b.isSale) return false;
      if (filterType === "sales" && !b.isSale) return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      const matchProduct = b.productName?.toLowerCase().includes(term);
      const matchCustomer = b.customerName?.toLowerCase().includes(term);
      const matchMaterial = b.materialName?.toLowerCase().includes(term);
      return matchProduct || matchCustomer || matchMaterial;
    });
  }, [budgets, filterType, searchTerm]);

  // Contadores
  const totalCount = budgets.length;
  const salesCount = budgets.filter((b) => b.isSale).length;
  const openBudgetsCount = totalCount - salesCount;

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o orçamento/venda "${name}"?`)) {
      setDeletingId(id);
      try {
        await onDeleteBudget(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Barra de Ferramentas & Filtros */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Campo de Busca */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por peça, cliente ou material..."
            className="w-full pl-11 pr-4 py-2 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant hover:text-on-surface"
            >
              ✕
            </button>
          )}
        </div>

        {/* Ações e Filtros */}
        <div className="flex items-center gap-2.5 flex-wrap self-start md:self-auto">
          {/* Botão Importar Planilha */}
          <button
            onClick={onOpenImportModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-primary-container text-on-primary hover:opacity-90 transition-opacity shadow-sm"
            title="Importar vendas ou orçamentos do Excel/CSV"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            Importar Planilha
          </button>

          {/* Botão Exportar Vendas */}
          <button
            onClick={handleExportSales}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30 transition-all shadow-sm disabled:opacity-50"
            title="Exportar todas as vendas em arquivo CSV formatado para Excel"
          >
            <span className={`material-symbols-outlined text-base text-emerald-500 ${exporting ? "animate-spin" : ""}`}>
              {exporting ? "progress_activity" : "download"}
            </span>
            {exporting ? "Exportando..." : "Exportar Vendas (.csv)"}
          </button>

          {/* Botões de Filtro */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "all"
                  ? "bg-surface-container-highest text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Todos ({totalCount})
            </button>
            <button
              onClick={() => setFilterType("budgets")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "budgets"
                  ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 shadow-sm border border-amber-500/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              Apenas Orçamentos ({openBudgetsCount})
            </button>
            <button
              onClick={() => setFilterType("sales")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                filterType === "sales"
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm border border-emerald-500/30"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Apenas Vendas ({salesCount})
            </button>
            <button
              onClick={onRefresh}
              title="Atualizar lista"
              className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors ml-1"
            >
              <span className={`material-symbols-outlined text-base ${loading ? "animate-spin" : ""}`}>
                refresh
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Lista / Tabela de Orçamentos */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-primary-container animate-spin mb-3">
            progress_activity
          </span>
          <p className="text-sm text-on-surface-variant font-medium">
            Carregando orçamentos e vendas...
          </p>
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">request_quote</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">
              Nenhum registro encontrado
            </h3>
            <p className="text-xs text-on-surface-variant max-w-sm mx-auto mt-1">
              {searchTerm
                ? `Nenhum orçamento corresponde à busca "${searchTerm}". Tente outros termos.`
                : "Você ainda não possui orçamentos salvos. Utilize a aba Calculadora para criar o primeiro!"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredBudgets.map((b) => {
            const isSale = b.isSale;

            return (
              <div
                key={b.id}
                className="group p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 hover:border-outline-variant/50 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Lado Esquerdo: Info da Peça e Cliente */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${
                      isSale
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    <span className="material-symbols-outlined text-2xl">
                      {isSale ? "shopping_cart_checkout" : "receipt_long"}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3
                        onClick={() => onOpenDetailModal(b)}
                        className="text-base font-bold text-on-surface hover:text-primary-container cursor-pointer transition-colors truncate"
                      >
                        {b.productName}
                      </h3>
                      {isSale ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          <span className="material-symbols-outlined text-xs">check_circle</span>
                          Venda Concretizada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          Orçamento Aberto
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-on-surface-variant flex-wrap">
                      {b.customerName && (
                        <span className="flex items-center gap-1 font-medium text-on-surface">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant">
                            person
                          </span>
                          {b.customerName}
                        </span>
                      )}
                      <span>•</span>
                      <span>{b.materialName} ({b.weightGrams}g)</span>
                      <span>•</span>
                      <span>{formatMinutes(b.printTimeMinutes)}</span>
                      {b.accessories && b.accessories.length > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-rose-500 font-medium">
                            {b.accessories.length} acessório(s)
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span className="text-[11px]">
                        {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Meio: Valores Financeiros */}
                <div className="flex items-center gap-6 px-3 py-2 rounded-xl bg-surface-container-low border border-outline-variant/15 justify-between md:justify-start">
                  <div>
                    <span className="text-[11px] text-on-surface-variant block">Custo Total</span>
                    <span className="font-mono text-sm font-semibold text-on-surface">
                      {formatBRL(b.totalCost)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-on-surface-variant block">
                      {isSale ? "Preço Vendido" : "Preço Sugerido"}
                    </span>
                    <span className={`font-mono text-base font-bold ${
                      isSale ? "text-emerald-600 dark:text-emerald-400" : "text-primary-container"
                    }`}>
                      {formatBRL(isSale ? b.finalPrice || b.suggestedPrice : b.suggestedPrice)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-on-surface-variant block">
                      {isSale ? "Lucro Real" : "Lucro Simulado"}
                    </span>
                    <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      {formatBRL(isSale ? b.actualProfit || 0 : b.simulatedProfit)}
                    </span>
                  </div>
                </div>

                {/* Lado Direito: Ações Rápidas */}
                <div className="flex items-center gap-2 justify-end">
                  {/* Duplicar / Reutilizar */}
                  <button
                    onClick={() => onDuplicate(b)}
                    className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/20"
                    title="Duplicar / Reutilizar parâmetros em novo orçamento"
                  >
                    <span className="material-symbols-outlined text-lg">content_copy</span>
                  </button>

                  {/* Marcar/Alterar Venda */}
                  <button
                    onClick={() => onOpenSaleModal(b)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                      isSale
                        ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
                        : "bg-surface-container border-outline-variant/25 text-on-surface hover:border-emerald-500/50 hover:text-emerald-500"
                    }`}
                    title={isSale ? "Editar valor da venda" : "Converter orçamento em venda"}
                  >
                    <span className="material-symbols-outlined text-base">
                      {isSale ? "edit" : "check"}
                    </span>
                    {isSale ? "Editar Venda" : "Virou Venda"}
                  </button>

                  {/* Ver Detalhes */}
                  <button
                    onClick={() => onOpenDetailModal(b)}
                    className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/20"
                    title="Ver detalhamento completo"
                  >
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </button>

                  {/* Excluir */}
                  <button
                    onClick={() => handleDelete(b.id, b.productName)}
                    disabled={deletingId === b.id}
                    className="p-2 rounded-xl bg-surface-container hover:bg-red-500/15 text-on-surface-variant hover:text-red-500 transition-colors border border-outline-variant/20 disabled:opacity-50"
                    title="Excluir orçamento"
                  >
                    <span className="material-symbols-outlined text-lg">delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
