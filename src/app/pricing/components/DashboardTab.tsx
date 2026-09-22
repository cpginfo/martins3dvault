"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DashboardMetrics, BudgetRecord } from "@/lib/pricing/types";
import { formatBRL } from "@/lib/pricing/calculator";

interface DashboardTabProps {
  onOpenDetailModal: (budget: BudgetRecord) => void;
}

export default function DashboardTab({ onOpenDetailModal }: DashboardTabProps) {
  const [period, setPeriod] = useState<"month" | "30days" | "all">("all");
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentSales, setRecentSales] = useState<BudgetRecord[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/pricing/stats?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
        setRecentSales(data.recentSales || []);
      }
    } catch (err: unknown) {
      console.error("Erro ao buscar estatísticas de vendas:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!ignore) {
        await fetchStats();
      }
    };
    run();
    return () => {
      ignore = true;
    };
  }, [fetchStats]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header & Period Selector */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-xl">
              analytics
            </span>
            Dashboard de Vendas & Telemetria Comercial
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Métricas calculadas exclusivamente sobre orçamentos marcados como vendas concretizadas
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {/* Filtro de Período */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-container-low border border-outline-variant/20">
            <button
              onClick={() => setPeriod("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === "month"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriod("30days")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === "30days"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Últimos 30 Dias
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                period === "all"
                  ? "bg-primary-container text-on-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              Todo o Período
            </button>
          </div>

          {/* Botão Exportar Vendas */}
          <button
            onClick={handleExportSales}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-surface-container-high text-on-surface hover:bg-surface-container-highest border border-outline-variant/30 transition-all shadow-sm disabled:opacity-50"
            title="Exportar todas as vendas registradas em formato CSV"
          >
            <span className={`material-symbols-outlined text-base text-emerald-500 ${exporting ? "animate-spin" : ""}`}>
              {exporting ? "progress_activity" : "download"}
            </span>
            {exporting ? "Exportando..." : "Exportar Vendas (.csv)"}
          </button>
        </div>
      </div>

      {/* Banner Informativo */}
      <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2.5">
        <span className="material-symbols-outlined text-lg">info</span>
        <span>
          <strong>Regra Contábil:</strong> Os orçamentos abertos/não vendidos são desconsiderados deste painel. Apenas vendas efetivas (com a flag <em>&ldquo;Marcar como venda&rdquo;</em> ativa) entram no cálculo do faturamento, custos e lucratividade real.
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl">
          <span className="material-symbols-outlined text-4xl text-primary-container animate-spin mb-3">
            progress_activity
          </span>
          <p className="text-sm text-on-surface-variant font-medium">
            Calculando métricas de vendas...
          </p>
        </div>
      ) : !metrics || metrics.salesCount === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-surface-container flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-3xl">point_of_sale</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface">
              Nenhuma venda registrada no período selecionado
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md mx-auto mt-1">
              Para contabilizar dados no Dashboard, marque um orçamento existente como venda ou crie um novo com a opção &ldquo;Marcar como Venda&rdquo; ativada.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Grid de 6 Cards Bento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Faturamento Total */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold uppercase tracking-wider">Faturamento Real</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 material-symbols-outlined text-base">
                  payments
                </span>
              </div>
              <div className="text-2xl font-black text-on-surface font-mono">
                {formatBRL(metrics.totalSalesValue)}
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                Soma total dos preços reais praticados
              </span>
            </div>

            {/* Card 2: Custo Total das Peças Vendidas */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold uppercase tracking-wider">Custo de Produção</span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 material-symbols-outlined text-base">
                  receipt
                </span>
              </div>
              <div className="text-2xl font-black text-on-surface font-mono">
                {formatBRL(metrics.totalCostsValue)}
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                Energia + Máquina + Filamento + Horas + Acessórios
              </span>
            </div>

            {/* Card 3: Lucro Líquido Real */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold uppercase tracking-wider">Lucro Líquido Real</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 material-symbols-outlined text-base">
                  trending_up
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {formatBRL(metrics.totalNetProfit)}
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                Faturamento bruto subtraído dos custos
              </span>
            </div>

            {/* Card 4: Margem Média Efetiva */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold uppercase tracking-wider">Margem Média Efetiva</span>
                <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 material-symbols-outlined text-base">
                  percent
                </span>
              </div>
              <div className="text-2xl font-black text-primary-container font-mono">
                {metrics.averageMarginPercent}%
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                Rentabilidade média sobre as vendas concluídas
              </span>
            </div>

            {/* Card 5: Vendas Realizadas */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold uppercase tracking-wider">Vendas Concretizadas</span>
                <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 material-symbols-outlined text-base">
                  inventory_2
                </span>
              </div>
              <div className="text-2xl font-black text-on-surface font-mono">
                {metrics.salesCount} peças
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                Total de pedidos faturados no período
              </span>
            </div>

            {/* Card 6: Ticket Médio */}
            <div className="p-5 rounded-2xl bg-surface-container-lowest border border-outline-variant/25 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span className="font-semibold uppercase tracking-wider">Ticket Médio</span>
                <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 material-symbols-outlined text-base">
                  price_check
                </span>
              </div>
              <div className="text-2xl font-black text-on-surface font-mono">
                {formatBRL(metrics.averageTicket)}
              </div>
              <span className="text-[11px] text-on-surface-variant block">
                Valor médio por peça/encomenda vendida
              </span>
            </div>
          </div>

          {/* Tabela de Vendas Concretizadas Recentes */}
          <div className="bg-surface-container-lowest border border-outline-variant/25 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-lg">
                history
              </span>
              Últimas Vendas Concretizadas no Período
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-container-high text-on-surface-variant uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Produto / Peça</th>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Material</th>
                    <th className="p-3 text-right">Custo Produção</th>
                    <th className="p-3 text-right">Preço Vendido</th>
                    <th className="p-3 text-right">Lucro Líquido</th>
                    <th className="p-3 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/15">
                  {recentSales.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-container/50 transition-colors">
                      <td className="p-3 text-on-surface-variant whitespace-nowrap">
                        {new Date(s.soldAt || s.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-3 font-semibold text-on-surface">
                        {s.productName}
                      </td>
                      <td className="p-3 text-on-surface-variant">
                        {s.customerName || "-"}
                      </td>
                      <td className="p-3 text-on-surface-variant">
                        {s.materialName}
                      </td>
                      <td className="p-3 text-right font-mono text-on-surface-variant">
                        {formatBRL(s.totalCost)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-on-surface">
                        {formatBRL(s.finalPrice || 0)}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatBRL(s.actualProfit || 0)}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => onOpenDetailModal(s)}
                          className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                          title="Ver detalhes da venda"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
