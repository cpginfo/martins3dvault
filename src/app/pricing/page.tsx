"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Navbar from "@/components/layout/Navbar";
import {
  PrinterConfig,
  MaterialConfig,
  BudgetCalculationInput,
  BudgetRecord,
  AccessoryItem,
} from "@/lib/pricing/types";
import CalculatorTab from "./components/CalculatorTab";
import BudgetsTab from "./components/BudgetsTab";
import DashboardTab from "./components/DashboardTab";
import SettingsTab from "./components/SettingsTab";
import BudgetDetailModal from "./components/BudgetDetailModal";
import SaleModal from "./components/SaleModal";
import ImportModal from "./components/ImportModal";

function PricingContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"calculator" | "budgets" | "dashboard" | "settings" | null>(null);

  const activeTab: "calculator" | "budgets" | "dashboard" | "settings" =
    selectedTab ??
    (tabParam === "dashboard" || tabParam === "budgets" || tabParam === "settings" || tabParam === "calculator"
      ? tabParam
      : "calculator");

  const handleTabChange = (tab: "calculator" | "budgets" | "dashboard" | "settings") => {
    setSelectedTab(tab);
    if (typeof window !== "undefined") {
      const url = tab === "calculator" ? "/pricing" : `/pricing?tab=${tab}`;
      window.history.replaceState(null, "", url);
      window.dispatchEvent(new Event("locationchange"));
    }
  };

  // Dados globais
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>({
    printerName: "Impressora 3D Principal",
    printerCost: 2500,
    powerWatts: 250,
    lifespanHours: 3000,
    electricityKwhCost: 0.85,
    manualHourlyRate: 35,
    defaultMarkup: 100,
  });

  const [materials, setMaterials] = useState<MaterialConfig[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [loadingBudgets, setLoadingBudgets] = useState(true);

  // Modais e duplicação
  const [detailModalBudget, setDetailModalBudget] = useState<BudgetRecord | null>(null);
  const [saleModalBudget, setSaleModalBudget] = useState<BudgetRecord | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [calculatorInitialData, setCalculatorInitialData] = useState<BudgetCalculationInput | null>(null);

  // Carrega configurações
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing/settings");
      if (res.ok) {
        const data = await res.json();
        setPrinterConfig(data);
      }
    } catch (err: unknown) {
      console.error("Erro ao carregar configurações de precificação:", err);
    }
  }, []);

  // Carrega materiais
  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch("/api/pricing/materials");
      if (res.ok) {
        const data = await res.json();
        setMaterials(data);
      }
    } catch (err: unknown) {
      console.error("Erro ao carregar materiais:", err);
    }
  }, []);

  // Carrega orçamentos
  const fetchBudgets = useCallback(async () => {
    setLoadingBudgets(true);
    try {
      const res = await fetch("/api/pricing/budgets");
      if (res.ok) {
        const data = await res.json();
        setBudgets(data);
      }
    } catch (err: unknown) {
      console.error("Erro ao carregar orçamentos:", err);
    } finally {
      setLoadingBudgets(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const loadAll = async () => {
      if (!ignore) {
        await Promise.all([fetchSettings(), fetchMaterials(), fetchBudgets()]);
      }
    };
    loadAll();
    return () => {
      ignore = true;
    };
  }, [fetchSettings, fetchMaterials, fetchBudgets]);

  // Duplicar orçamento
  const handleDuplicate = (budget: BudgetRecord) => {
    const hours = Math.floor((budget.printTimeMinutes || 0) / 60);
    const minutes = (budget.printTimeMinutes || 0) % 60;
    const modelHours = Math.floor((budget.modelingTimeMinutes || 0) / 60);
    const modelMinutes = (budget.modelingTimeMinutes || 0) % 60;
    const assHours = Math.floor((budget.assemblyTimeMinutes || 0) / 60);
    const assMinutes = (budget.assemblyTimeMinutes || 0) % 60;

    const dupData: BudgetCalculationInput = {
      productName: `${budget.productName} (Cópia)`,
      customerName: budget.customerName || "",
      printTimeHours: hours,
      printTimeMinutes: minutes,
      weightGrams: budget.weightGrams,
      materialCostPerKg: budget.materialCostPerKg,
      materialName: budget.materialName || "Material",
      materialId: budget.materialId,
      modelingTimeHours: modelHours,
      modelingTimeMinutes: modelMinutes,
      assemblyTimeHours: assHours,
      assemblyTimeMinutes: assMinutes,
      markupPercent: budget.markupPercent,
      accessories: (budget.accessories || []).map((a: AccessoryItem) => ({
        name: a.name,
        unitPrice: a.unitPrice,
        quantity: a.quantity,
      })),
      isSale: false,
      finalPrice: null,
    };

    setCalculatorInitialData(dupData);
    handleTabChange("calculator");
  };

  // Salvar status de venda no modal
  const handleSaveSaleModal = async (
    budgetId: string,
    isSale: boolean,
    finalPrice: number | null
  ) => {
    const res = await fetch(`/api/pricing/budgets/${budgetId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        toggleSaleOnly: true,
        isSale,
        finalPrice,
        soldAt: isSale ? new Date().toISOString() : null,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Falha ao salvar status de venda.");
    }

    await fetchBudgets();
  };

  // Deletar orçamento
  const handleDeleteBudget = async (id: string) => {
    const res = await fetch(`/api/pricing/budgets/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Falha ao excluir orçamento.");
    }

    await fetchBudgets();
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
      />

      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isSidebarCollapsed ? "pl-20" : "pl-72"
        }`}
      >
        <Navbar />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto space-y-6 pt-20">
          {/* Header Superior com Abas */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-5">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-container text-on-primary shadow-sm">
                  <span className="material-symbols-outlined text-2xl">calculate</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight text-on-surface">
                  Orçamentos & Precificação 3D
                </h1>
              </div>
              <p className="text-xs text-on-surface-variant mt-1">
                Motor analítico de custos de impressão, conversão em vendas e inteligência financeira
              </p>
            </div>

            {/* Abas de Navegação Principal */}
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-low border border-outline-variant/25 self-start sm:self-auto overflow-x-auto max-w-full">
              <button
                onClick={() => handleTabChange("calculator")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "calculator"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-base">calculate</span>
                Calculadora
              </button>

              <button
                onClick={() => {
                  handleTabChange("budgets");
                  fetchBudgets();
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "budgets"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-base">receipt_long</span>
                Orçamentos & Vendas ({budgets.length})
              </button>

              <button
                onClick={() => handleTabChange("dashboard")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "dashboard"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-base">analytics</span>
                Métricas & Vendas
              </button>

              <button
                onClick={() => handleTabChange("settings")}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeTab === "settings"
                    ? "bg-primary-container text-on-primary shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`}
              >
                <span className="material-symbols-outlined text-base">settings</span>
                Configurações & Materiais
              </button>
            </div>
          </div>

          {/* Renderização da Aba Ativa */}
          {activeTab === "calculator" && (
            <CalculatorTab
              printerConfig={printerConfig}
              materials={materials}
              initialData={calculatorInitialData}
              onBudgetSaved={() => {
                fetchBudgets();
              }}
              onOpenNewMaterialModal={() => handleTabChange("settings")}
            />
          )}

          {activeTab === "budgets" && (
            <BudgetsTab
              budgets={budgets}
              loading={loadingBudgets}
              onRefresh={fetchBudgets}
              onOpenImportModal={() => setIsImportModalOpen(true)}
              onDuplicate={handleDuplicate}
              onOpenSaleModal={(b) => setSaleModalBudget(b)}
              onOpenDetailModal={(b) => setDetailModalBudget(b)}
              onDeleteBudget={handleDeleteBudget}
            />
          )}

          {activeTab === "dashboard" && (
            <DashboardTab
              onOpenDetailModal={(b) => setDetailModalBudget(b)}
            />
          )}

          {activeTab === "settings" && (
            <SettingsTab
              printerConfig={printerConfig}
              materials={materials}
              onSettingsUpdated={(newConf) => setPrinterConfig(newConf)}
              onMaterialsUpdated={() => fetchMaterials()}
            />
          )}
        </main>
      </div>

      {/* Modais Globais */}
      {detailModalBudget && (
        <BudgetDetailModal
          budget={detailModalBudget}
          onClose={() => setDetailModalBudget(null)}
          onDuplicate={handleDuplicate}
        />
      )}

      {saleModalBudget && (
        <SaleModal
          budget={saleModalBudget}
          onClose={() => setSaleModalBudget(null)}
          onSave={handleSaveSaleModal}
        />
      )}

      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchBudgets();
          fetchMaterials();
        }}
      />
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary-container">
            progress_activity
          </span>
        </div>
      }
    >
      <PricingContent />
    </Suspense>
  );
}
