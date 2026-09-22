import {
  calculatePrintCost,
  calculateSalesMetrics,
  formatBRL,
  formatMinutes,
} from "../calculator";
import { PrinterConfig, BudgetCalculationInput, SaleRecord } from "../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ Test Failed: ${message}`);
  }
}

function runTests() {
  console.log("🧪 Iniciando testes unitários do motor de precificação 3D...");

  const mockPrinter: PrinterConfig = {
    printerCost: 3000, // R$ 3.000,00
    powerWatts: 200, // 200W
    lifespanHours: 3000, // 3000 horas -> R$ 1,00/hora de depreciação
    electricityKwhCost: 1.0, // R$ 1,00 / kWh -> 200/1000 * 1 = R$ 0,20/hora de energia
    manualHourlyRate: 40.0, // R$ 40,00 / hora
    defaultMarkup: 100.0, // 100%
  };

  // Teste 1: Impressão de 5 horas, 100g de PLA (R$ 100/kg), sem trabalho manual e sem acessórios
  const input1: BudgetCalculationInput = {
    productName: "Vaso Geométrico",
    printTimeHours: 5,
    printTimeMinutes: 0,
    weightGrams: 100,
    materialCostPerKg: 100, // R$ 100/kg -> 0.10/g -> R$ 10,00
    markupPercent: 100,
  };

  const res1 = calculatePrintCost(input1, mockPrinter);

  // Energia: (200 / 1000) * 5 * 1.0 = R$ 1,00
  assert(res1.energyCost === 1.0, `Energia esperada 1.00, obtido ${res1.energyCost}`);
  // Depreciação: (3000 / 3000) * 5 = R$ 5,00
  assert(res1.depreciationCost === 5.0, `Depreciação esperada 5.00, obtido ${res1.depreciationCost}`);
  // Material: (100 / 1000) * 100 = R$ 10,00
  assert(res1.materialCost === 10.0, `Material esperado 10.00, obtido ${res1.materialCost}`);
  // Mão de obra: 0
  assert(res1.laborCost === 0.0, `Mão de obra esperada 0, obtido ${res1.laborCost}`);
  // Acessórios: 0
  assert(res1.accessoriesCost === 0.0, `Acessórios esperados 0, obtido ${res1.accessoriesCost}`);
  // Custo Total: 1 + 5 + 10 = R$ 16,00
  assert(res1.totalCost === 16.0, `Custo total esperado 16.00, obtido ${res1.totalCost}`);
  // Preço Simulado (100% markup): 16 * 2 = R$ 32,00
  assert(res1.suggestedPrice === 32.0, `Preço sugerido esperado 32.00, obtido ${res1.suggestedPrice}`);
  // Lucro Simulado: R$ 16,00
  assert(res1.simulatedProfit === 16.0, `Lucro simulado esperado 16.00, obtido ${res1.simulatedProfit}`);
  console.log("✅ Teste 1 (Cálculo básico sem acessórios) passou!");

  // Teste 2: Impressão de 2h 30m, 50g, 30m modelagem, 15m montagem, com 2 acessórios
  const input2: BudgetCalculationInput = {
    productName: "Luminária Articulada",
    customerName: "Carlos Silva",
    printTimeHours: 2,
    printTimeMinutes: 30, // 2.5h
    weightGrams: 50,
    materialCostPerKg: 120, // R$ 120/kg -> 0.12/g * 50 = R$ 6,00
    modelingTimeHours: 0,
    modelingTimeMinutes: 30, // 0.5h
    assemblyTimeHours: 0,
    assemblyTimeMinutes: 15, // 0.25h -> total manual 0.75h * 40 = R$ 30,00
    markupPercent: 80,
    accessories: [
      { name: "Fita LED 50cm", unitPrice: 15.0, quantity: 1 },
      { name: "Interruptor", unitPrice: 5.0, quantity: 2 },
    ], // Acessórios = 15 + 10 = R$ 25,00
    isSale: true,
    finalPrice: 120.0, // Venda com preço real informado
  };

  const res2 = calculatePrintCost(input2, mockPrinter);

  // Energia: (200/1000) * 2.5 * 1.0 = R$ 0,50
  assert(res2.energyCost === 0.5, `Energia esperada 0.50, obtido ${res2.energyCost}`);
  // Depreciação: (3000/3000) * 2.5 = R$ 2,50
  assert(res2.depreciationCost === 2.5, `Depreciação esperada 2.50, obtido ${res2.depreciationCost}`);
  // Material: (120/1000) * 50 = R$ 6,00
  assert(res2.materialCost === 6.0, `Material esperado 6.00, obtido ${res2.materialCost}`);
  // Mão de obra: 0.75h * 40 = R$ 30,00
  assert(res2.laborCost === 30.0, `Mão de obra esperada 30.00, obtido ${res2.laborCost}`);
  // Acessórios: 15 + 10 = R$ 25,00
  assert(res2.accessoriesCost === 25.0, `Acessórios esperados 25.00, obtido ${res2.accessoriesCost}`);
  // Custo Total: 0.5 + 2.5 + 6 + 30 + 25 = R$ 64,00
  assert(res2.totalCost === 64.0, `Custo total esperado 64.00, obtido ${res2.totalCost}`);
  // Preço Simulado (80% markup): 64 * 1.8 = R$ 115,20
  assert(res2.suggestedPrice === 115.2, `Preço sugerido esperado 115.20, obtido ${res2.suggestedPrice}`);
  // Venda Real: finalPrice = 120
  assert(res2.isSale === true, "isSale deve ser true");
  assert(res2.finalPrice === 120.0, "finalPrice deve ser 120.00");
  // Lucro Real: 120 - 64 = R$ 56,00
  assert(res2.actualProfit === 56.0, `Lucro real esperado 56.00, obtido ${res2.actualProfit}`);
  // Diferença vs Simulado: 120 - 115.2 = +4.80 (acréscimo)
  assert(res2.priceDifference === 4.8, `Diferença esperada 4.80, obtido ${res2.priceDifference}`);
  console.log("✅ Teste 2 (Cálculo completo com acessórios e venda real) passou!");

  // Teste 3: Venda com Desconto
  const input3: BudgetCalculationInput = {
    productName: "Suporte Headphone",
    printTimeHours: 1,
    printTimeMinutes: 0,
    weightGrams: 100,
    materialCostPerKg: 100,
    markupPercent: 100, // Custo: 0.2 + 1 + 10 = 11.20 -> Simulado: 22.40
    isSale: true,
    finalPrice: 20.0, // Desconto dado ao cliente
  };
  const res3 = calculatePrintCost(input3, mockPrinter);
  assert(res3.priceDifference! < 0, `Diferença deve ser negativa (desconto): ${res3.priceDifference}`);
  assert(res3.actualProfit! > 0, `Mesmo com desconto, lucro real deve ser positivo: ${res3.actualProfit}`);
  console.log("✅ Teste 3 (Venda com desconto) passou!");

  // Teste 4: Dashboard Metrics (estritamente filtrando apenas vendas com isSale: true)
  const records: SaleRecord[] = [
    { isSale: true, finalPrice: 120.0, totalCost: 64.0, createdAt: new Date() },
    { isSale: true, finalPrice: 20.0, totalCost: 11.2, createdAt: new Date() },
    { isSale: false, finalPrice: null, totalCost: 50.0, createdAt: new Date() }, // Orçamento NÃO vendido
    { isSale: false, finalPrice: 100.0, totalCost: 30.0, createdAt: new Date() }, // isSale false
  ];

  const metrics = calculateSalesMetrics(records);
  // Total de vendas: 120 + 20 = 140
  assert(metrics.totalSalesValue === 140.0, `Faturamento esperado 140.00, obtido ${metrics.totalSalesValue}`);
  // Custos totais das vendas: 64 + 11.2 = 75.2
  assert(metrics.totalCostsValue === 75.2, `Custos esperados 75.20, obtido ${metrics.totalCostsValue}`);
  // Lucro total: 140 - 75.2 = 64.8
  assert(metrics.totalNetProfit === 64.8, `Lucro líquido esperado 64.80, obtido ${metrics.totalNetProfit}`);
  // Contagem: 2 vendas
  assert(metrics.salesCount === 2, `Quantidade de vendas esperada 2, obtido ${metrics.salesCount}`);
  // Ticket Médio: 140 / 2 = 70.0
  assert(metrics.averageTicket === 70.0, `Ticket médio esperado 70.00, obtido ${metrics.averageTicket}`);
  console.log("✅ Teste 4 (Dashboard de métricas restrito a vendas) passou!");

  // Teste 5: Utilitários
  assert(formatMinutes(150) === "2h 30m", "150 min deve formatar como 2h 30m");
  assert(formatMinutes(45) === "45m", "45 min deve formatar como 45m");
  assert(formatMinutes(120) === "2h", "120 min deve formatar como 2h");
  assert(formatBRL(1234.56).includes("1.234,56"), "Formatação BRL correta");
  console.log("✅ Teste 5 (Utilitários de data e moeda) passou!");

  console.log("\n🎉 TODOS OS TESTES UNITÁRIOS FORAM APROVADOS COM SUCESSO!\n");
}

runTests();
