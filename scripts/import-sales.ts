import fs from "fs";
import path from "path";
import rawPrisma from "../src/lib/prisma";
import { calculatePrintCost, formatBRL } from "../src/lib/pricing/calculator";
import { PrinterConfig } from "../src/lib/pricing/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = rawPrisma as any;

/**
 * Normaliza valores numéricos vindos do Excel (aceita R$ 1.500,50 ou 1500.50 ou 150,00)
 */
function parseNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  
  let cleaned = String(val).trim();
  if (!cleaned || cleaned === "-" || cleaned === "N/A" || cleaned === "null") return 0;
  
  // Remove "R$", espaços, etc.
  cleaned = cleaned.replace(/R\$\s*/gi, "").replace(/\s/g, "");
  
  // Se contiver vírgula e ponto (ex: 1.250,50)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    // Apenas vírgula (ex: 150,50)
    cleaned = cleaned.replace(",", ".");
  }
  
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Detecta delimitador (, ou ; ou \t)
 */
function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

/**
 * Divide linha de CSV respeitando aspas
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const regex = new RegExp(`(?:^|${delimiter})(?:"([^"]*(?:""[^"]*)*)"|([^"${delimiter}]*))`, "g");
  const result: string[] = [];
  let match;
  while ((match = regex.exec(line)) !== null) {
    const value = match[1] !== undefined ? match[1].replace(/""/g, '"') : match[2];
    result.push(value ? value.trim() : "");
  }
  return result;
}

export async function importSalesFromCsv(filePath: string) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Arquivo não encontrado: ${absolutePath}`);
  }

  // Lê conteúdo tratando BOM UTF-8 se houver
  let content = fs.readFileSync(absolutePath, "utf-8");
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("O arquivo CSV precisa ter ao menos o cabeçalho e 1 linha de dados.");
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  );

  console.log(`\n📄 Processando arquivo: ${path.basename(absolutePath)}`);
  console.log(`🔍 Delimitador detectado: "${delimiter === "\t" ? "\\t (Tab)" : delimiter}"`);
  console.log(`📊 Linhas de dados encontradas: ${lines.length - 1}`);

  // Mapeamento flexível de índices de coluna
  const colIndex = {
    produto: headers.findIndex((h) => h.includes("produto") || h.includes("peca") || h.includes("item")),
    material: headers.findIndex((h) => h.includes("material") && !h.includes("gasto") && !h.includes("custo")),
    custoKg: headers.findIndex((h) => (h.includes("custo") && h.includes("kg")) || h.includes("r$/kg")),
    pesoG: headers.findIndex((h) => h.includes("gasto") || h.includes("peso") || h.includes("(g)")),
    horas: headers.findIndex((h) => h.includes("hora")),
    minutos: headers.findIndex((h) => h.includes("minuto")),
    valorVendido: headers.findIndex((h) => h.includes("vendido") || h.includes("venda") || h.includes("valor final") || h.includes("preco")),
    cliente: headers.findIndex((h) => h.includes("cliente") || h.includes("comprador")),
  };

  if (colIndex.produto === -1) {
    throw new Error(`Coluna obrigatória "Produto" não foi identificada no cabeçalho: ${lines[0]}`);
  }

  // Busca configurações da impressora no banco
  let settings = await prisma.printerSettings.findFirst({
    where: { isDefault: true },
  });

  if (!settings) {
    settings = await prisma.printerSettings.create({
      data: {
        printerName: "Impressora 3D Principal",
        printerCost: 2500,
        powerWatts: 250,
        lifespanHours: 3000,
        electricityKwhCost: 0.85,
        manualHourlyRate: 35,
        defaultMarkup: 100,
        isDefault: true,
      },
    });
  }

  const printerConfig: PrinterConfig = {
    printerCost: settings.printerCost,
    powerWatts: settings.powerWatts,
    lifespanHours: settings.lifespanHours,
    electricityKwhCost: settings.electricityKwhCost,
    manualHourlyRate: settings.manualHourlyRate,
    defaultMarkup: settings.defaultMarkup,
  };

  // Carrega materiais cadastrados para auto-vinculação se houver match
  const existingMaterials = await prisma.printMaterial.findMany();

  let importedSalesCount = 0;
  let importedBudgetsCount = 0;
  let totalRevenue = 0;
  let totalCosts = 0;

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cols = splitCsvLine(rawLine, delimiter);

    const productName = colIndex.produto !== -1 ? cols[colIndex.produto]?.trim() : "";
    if (!productName) continue; // Pula linha vazia

    const materialName =
      (colIndex.material !== -1 && cols[colIndex.material]?.trim()) || "PLA Standard";
    
    let costPerKg = colIndex.custoKg !== -1 ? parseNumber(cols[colIndex.custoKg]) : 0;
    if (costPerKg <= 0) {
      const matchMat = existingMaterials.find(
        (m: { name: string; costPerKg: number; id: string }) =>
          m.name.toLowerCase() === materialName.toLowerCase()
      );
      costPerKg = matchMat ? matchMat.costPerKg : 110.0;
    }

    const weightGrams = colIndex.pesoG !== -1 ? parseNumber(cols[colIndex.pesoG]) : 50;
    const hours = colIndex.horas !== -1 ? parseNumber(cols[colIndex.horas]) : 0;
    const minutes = colIndex.minutos !== -1 ? parseNumber(cols[colIndex.minutos]) : 0;
    const totalMinutes = Math.max(1, hours * 60 + minutes); // Mínimo 1 min

    const rawValorVendido = colIndex.valorVendido !== -1 ? cols[colIndex.valorVendido]?.trim() : "";
    const numericVendido = parseNumber(rawValorVendido);
    
    // Se "Valor Vendido" estiver preenchido e for maior que 0 -> Venda Efetiva. Senão -> Orçamento
    const isSale = Boolean(rawValorVendido && numericVendido > 0);
    const finalPrice = isSale ? numericVendido : null;

    const customerName =
      colIndex.cliente !== -1 && cols[colIndex.cliente]?.trim()
        ? cols[colIndex.cliente].trim()
        : null;

    // Executa cálculo determinístico oficial
    const calc = calculatePrintCost(
      {
        productName,
        customerName,
        printTimeHours: Math.floor(totalMinutes / 60),
        printTimeMinutes: totalMinutes % 60,
        weightGrams: Math.max(1, weightGrams),
        materialCostPerKg: costPerKg,
        materialName,
        markupPercent: printerConfig.defaultMarkup || 100,
        accessories: [],
        isSale,
        finalPrice,
      },
      printerConfig
    );

    // Cria registro no PostgreSQL
    await prisma.printBudget.create({
      data: {
        productName,
        customerName,
        printTimeMinutes: totalMinutes,
        weightGrams: Math.max(1, weightGrams),
        materialName,
        materialCostPerKg: costPerKg,
        modelingTimeMinutes: 0,
        assemblyTimeMinutes: 0,
        markupPercent: printerConfig.defaultMarkup || 100,
        powerWatts: printerConfig.powerWatts,
        electricityKwhCost: printerConfig.electricityKwhCost,
        printerCost: printerConfig.printerCost,
        lifespanHours: printerConfig.lifespanHours,
        manualHourlyRate: printerConfig.manualHourlyRate,
        energyCost: calc.energyCost,
        depreciationCost: calc.depreciationCost,
        materialCost: calc.materialCost,
        laborCost: calc.laborCost,
        accessoriesCost: 0,
        totalCost: calc.totalCost,
        suggestedPrice: calc.suggestedPrice,
        simulatedProfit: calc.simulatedProfit,
        isSale,
        finalPrice: calc.finalPrice,
        actualProfit: calc.actualProfit,
        priceDifference: calc.priceDifference,
        soldAt: isSale ? new Date() : null,
        notes: "Importado via planilha Excel/CSV",
      },
    });

    if (isSale && finalPrice) {
      importedSalesCount++;
      totalRevenue += finalPrice;
      totalCosts += calc.totalCost;
    } else {
      importedBudgetsCount++;
    }
  }

  console.log("\n=================================================");
  console.log("✅ IMPORTAÇÃO CONCLUÍDA COM SUCESSO!");
  console.log("=================================================");
  console.log(`📦 Vendas Efetivas Importadas : ${importedSalesCount}`);
  console.log(`📝 Orçamentos Abertos          : ${importedBudgetsCount}`);
  console.log(`💰 Faturamento Total Importado: ${formatBRL(totalRevenue)}`);
  console.log(`📉 Custo Total de Produção    : ${formatBRL(totalCosts)}`);
  console.log(`💵 Lucro Líquido Real         : ${formatBRL(totalRevenue - totalCosts)}`);
  console.log("=================================================\n");

  return {
    importedSalesCount,
    importedBudgetsCount,
    totalRevenue,
    totalCosts,
  };
}

// Execução direta via CLI se chamado diretamente
if (require.main === module) {
  const targetFile = process.argv[2];
  if (!targetFile) {
    console.error("Uso: npx tsx scripts/import-sales.ts <caminho_do_arquivo.csv>");
    process.exit(1);
  }

  importSalesFromCsv(targetFile)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Erro na importação:", err.message);
      process.exit(1);
    });
}
