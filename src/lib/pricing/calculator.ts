import {
  PrinterConfig,
  BudgetCalculationInput,
  BudgetCalculationBreakdown,
  SaleRecord,
  DashboardMetrics,
} from "./types";

/**
 * Arredonda um número para N casas decimais
 */
export function roundTo(val: number, decimals: number = 2): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

/**
 * Formata um valor numérico para o padrão de moeda brasileira (R$ 0,00)
 */
export function formatBRL(value: number): string {
  if (isNaN(value) || !isFinite(value)) return "R$ 0,00";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata minutos em formato amigável (ex: 2h 45m ou 30m)
 */
export function formatMinutes(totalMinutes: number): string {
  if (!totalMinutes || totalMinutes <= 0) return "0 min";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Executa o cálculo determinístico de custos e precificação de peças 3D
 */
export function calculatePrintCost(
  input: BudgetCalculationInput,
  printer: PrinterConfig
): BudgetCalculationBreakdown {
  // Validação e normalização de tempos
  const printH = Math.max(0, Number(input.printTimeHours) || 0);
  const printM = Math.max(0, Number(input.printTimeMinutes) || 0);
  const totalPrintMinutes = printH * 60 + printM;
  const printHours = totalPrintMinutes / 60;

  const modelH = Math.max(0, Number(input.modelingTimeHours) || 0);
  const modelM = Math.max(0, Number(input.modelingTimeMinutes) || 0);
  const totalModelMinutes = modelH * 60 + modelM;

  const assemblyH = Math.max(0, Number(input.assemblyTimeHours) || 0);
  const assemblyM = Math.max(0, Number(input.assemblyTimeMinutes) || 0);
  const totalAssemblyMinutes = assemblyH * 60 + assemblyM;

  const totalLaborMinutes = totalModelMinutes + totalAssemblyMinutes;
  const laborHours = totalLaborMinutes / 60;

  // 1. Custo de Energia = (Potência em W / 1000) * Horas de Impressão * Custo do kWh
  const powerWatts = Math.max(0, Number(printer.powerWatts) || 0);
  const electricityKwhCost = Math.max(0, Number(printer.electricityKwhCost) || 0);
  const energyCost = (powerWatts / 1000) * printHours * electricityKwhCost;

  // 2. Custo de Desgaste/Depreciação = (Valor da Impressora / Vida Útil em Horas) * Horas de Impressão
  const printerCost = Math.max(0, Number(printer.printerCost) || 0);
  const lifespanHours = Math.max(1, Number(printer.lifespanHours) || 1);
  const depreciationCost = (printerCost / lifespanHours) * printHours;

  // 3. Custo de Material = (Custo do kg / 1000) * Peso da peça em gramas
  const materialCostPerKg = Math.max(0, Number(input.materialCostPerKg) || 0);
  const weightGrams = Math.max(0, Number(input.weightGrams) || 0);
  const materialCost = (materialCostPerKg / 1000) * weightGrams;

  // 4. Custo de Mão de Obra = Horas de trabalho manual * Valor hora configurado
  const manualHourlyRate = Math.max(0, Number(printer.manualHourlyRate) || 0);
  const laborCost = laborHours * manualHourlyRate;

  // 5. Custo de Acessórios = Soma de (valor unitário * quantidade)
  const accessories = input.accessories || [];
  const accessoriesCost = accessories.reduce((acc, item) => {
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const quantity = Math.max(0, Number(item.quantity) || 0);
    return acc + unitPrice * quantity;
  }, 0);

  // 6. Custo Total = energia + desgaste + material + mão de obra + acessórios
  const totalCost = energyCost + depreciationCost + materialCost + laborCost + accessoriesCost;

  // 7. Preço de Venda Simulado = Custo Total * (1 + Markup/100)
  const markupPercent = Math.max(0, Number(input.markupPercent) || 0);
  const suggestedPrice = totalCost * (1 + markupPercent / 100);

  // 8. Margem e Lucro Simulados
  const simulatedProfit = suggestedPrice - totalCost;
  const simulatedMarginPercent = suggestedPrice > 0 ? (simulatedProfit / suggestedPrice) * 100 : 0;

  // 9. Venda Real (se informada)
  const isSale = Boolean(input.isSale);
  const finalPrice =
    input.finalPrice !== null && input.finalPrice !== undefined
      ? Math.max(0, Number(input.finalPrice))
      : null;

  let actualProfit: number | null = null;
  let actualMarginPercent: number | null = null;
  let priceDifference: number | null = null;

  if (finalPrice !== null) {
    actualProfit = finalPrice - totalCost;
    actualMarginPercent = finalPrice > 0 ? (actualProfit / finalPrice) * 100 : 0;
    priceDifference = finalPrice - suggestedPrice;
  }

  return {
    totalPrintTimeMinutes: Math.round(totalPrintMinutes),
    printHours: roundTo(printHours, 4),
    totalLaborTimeMinutes: Math.round(totalLaborMinutes),
    laborHours: roundTo(laborHours, 4),

    energyCost: roundTo(energyCost, 2),
    depreciationCost: roundTo(depreciationCost, 2),
    materialCost: roundTo(materialCost, 2),
    laborCost: roundTo(laborCost, 2),
    accessoriesCost: roundTo(accessoriesCost, 2),

    totalCost: roundTo(totalCost, 2),
    suggestedPrice: roundTo(suggestedPrice, 2),
    simulatedProfit: roundTo(simulatedProfit, 2),
    simulatedMarginPercent: roundTo(simulatedMarginPercent, 1),

    isSale,
    finalPrice: finalPrice !== null ? roundTo(finalPrice, 2) : null,
    actualProfit: actualProfit !== null ? roundTo(actualProfit, 2) : null,
    actualMarginPercent: actualMarginPercent !== null ? roundTo(actualMarginPercent, 1) : null,
    priceDifference: priceDifference !== null ? roundTo(priceDifference, 2) : null,
  };
}

/**
 * Calcula métricas agregadas de vendas exclusivamente para registros com is_venda === true
 */
export function calculateSalesMetrics(sales: SaleRecord[]): DashboardMetrics {
  // Filtra estritamente apenas registros que são vendas e possuem preço final válido
  const validSales = sales.filter((s) => s.isSale && s.finalPrice !== null && s.finalPrice > 0);

  const salesCount = validSales.length;
  if (salesCount === 0) {
    return {
      totalSalesValue: 0,
      totalCostsValue: 0,
      totalNetProfit: 0,
      averageMarginPercent: 0,
      salesCount: 0,
      averageTicket: 0,
    };
  }

  const totalSalesValue = validSales.reduce((acc, s) => acc + (s.finalPrice || 0), 0);
  const totalCostsValue = validSales.reduce((acc, s) => acc + (s.totalCost || 0), 0);
  const totalNetProfit = totalSalesValue - totalCostsValue;
  const averageMarginPercent = totalSalesValue > 0 ? (totalNetProfit / totalSalesValue) * 100 : 0;
  const averageTicket = totalSalesValue / salesCount;

  return {
    totalSalesValue: roundTo(totalSalesValue, 2),
    totalCostsValue: roundTo(totalCostsValue, 2),
    totalNetProfit: roundTo(totalNetProfit, 2),
    averageMarginPercent: roundTo(averageMarginPercent, 1),
    salesCount,
    averageTicket: roundTo(averageTicket, 2),
  };
}
