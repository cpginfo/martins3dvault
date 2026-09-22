export interface PrinterConfig {
  id?: string;
  printerName?: string;
  printerCost: number; // Valor de compra (R$)
  powerWatts: number; // Consumo em Watts (W)
  lifespanHours: number; // Vida útil estimada em horas
  electricityKwhCost: number; // Custo do kWh (R$)
  manualHourlyRate: number; // Valor da hora de trabalho manual (R$/h)
  defaultMarkup: number; // MarkUp padrão (%)
}

export interface MaterialConfig {
  id?: string;
  name: string;
  costPerKg: number; // R$/kg
  density?: number | null;
  color?: string | null;
  brand?: string | null;
}

export interface AccessoryItem {
  id?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  totalPrice?: number;
}

export interface BudgetCalculationInput {
  productName: string;
  customerName?: string | null;
  printTimeHours: number;
  printTimeMinutes: number;
  weightGrams: number;
  materialCostPerKg: number;
  materialName?: string;
  materialId?: string | null;
  modelingTimeHours?: number;
  modelingTimeMinutes?: number;
  assemblyTimeHours?: number;
  assemblyTimeMinutes?: number;
  markupPercent: number;
  accessories?: AccessoryItem[];
  isSale?: boolean;
  finalPrice?: number | null;
}

export interface BudgetCalculationBreakdown {
  totalPrintTimeMinutes: number;
  printHours: number;
  totalLaborTimeMinutes: number;
  laborHours: number;
  
  // Custos individuais
  energyCost: number;
  depreciationCost: number;
  materialCost: number;
  laborCost: number;
  accessoriesCost: number;
  
  // Custo total e preços
  totalCost: number; // Preço de custo
  suggestedPrice: number; // Preço de venda simulado
  simulatedProfit: number; // Lucro simulado (R$)
  simulatedMarginPercent: number; // Margem simulada (%)
  
  // Venda real
  isSale: boolean;
  finalPrice: number | null;
  actualProfit: number | null;
  actualMarginPercent: number | null;
  priceDifference: number | null; // finalPrice - suggestedPrice
}

export interface SaleRecord {
  isSale: boolean;
  finalPrice: number | null;
  totalCost: number;
  soldAt?: Date | string | null;
  createdAt: Date | string;
}

export interface DashboardMetrics {
  totalSalesValue: number; // Soma dos preços reais vendidos
  totalCostsValue: number; // Soma dos custos totais das vendas
  totalNetProfit: number; // Faturamento - Custos
  averageMarginPercent: number; // (Lucro / Faturamento) * 100
  salesCount: number; // Quantidade de vendas realizadas
  averageTicket: number; // Média por venda
}

export interface BudgetRecord {
  id: string;
  productName: string;
  customerName?: string | null;
  printTimeMinutes: number;
  weightGrams: number;
  materialId?: string | null;
  materialName?: string | null;
  materialCostPerKg: number;
  modelingTimeMinutes: number;
  assemblyTimeMinutes: number;
  markupPercent: number;
  powerWatts: number;
  electricityKwhCost: number;
  printerCost: number;
  lifespanHours: number;
  manualHourlyRate: number;
  energyCost: number;
  depreciationCost: number;
  materialCost: number;
  laborCost: number;
  accessoriesCost: number;
  totalCost: number;
  suggestedPrice: number;
  simulatedProfit: number;
  isSale: boolean;
  finalPrice: number | null;
  actualProfit: number | null;
  priceDifference: number | null;
  soldAt?: Date | string | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  accessories?: AccessoryItem[];
  material?: MaterialConfig | null;
}
