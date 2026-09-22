import { NextResponse } from "next/server";
import rawPrisma from "@/lib/prisma";
import { calculatePrintCost } from "@/lib/pricing/calculator";
import { PrinterConfig } from "@/lib/pricing/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = rawPrisma as any;

function parseNumber(val: string | number | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  let cleaned = String(val).trim();
  if (!cleaned || cleaned === "-" || cleaned === "N/A" || cleaned === "null") return 0;

  // Remove "R$", espaços, etc.
  cleaned = cleaned.replace(/R\$\s*/gi, "").replace(/\s/g, "");

  // Trata formato brasileiro 1.250,50 ou 150,00 vs formato internacional 1500.50
  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function detectDelimiter(firstLine: string): string {
  const semicolons = (firstLine.match(/;/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;

  if (semicolons > commas && semicolons > tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

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

export async function POST(request: Request) {
  try {
    let rawCsv = "";
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 });
      }
      rawCsv = await file.text();
    } else {
      const body = await request.json();
      rawCsv = body.csvContent || "";
    }

    // Remove BOM se presente
    if (rawCsv.charCodeAt(0) === 0xfeff) {
      rawCsv = rawCsv.slice(1);
    }

    const lines = rawCsv.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return NextResponse.json(
        { error: "O arquivo deve conter o cabeçalho e pelo menos 1 linha de dados." },
        { status: 400 }
      );
    }

    const delimiter = detectDelimiter(lines[0]);
    const headers = splitCsvLine(lines[0], delimiter).map((h) =>
      h.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    );

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
      return NextResponse.json(
        { error: `Coluna obrigatória "Produto" não foi identificada no cabeçalho.` },
        { status: 400 }
      );
    }

    // Busca configurações da impressora
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

    const existingMaterials = await prisma.printMaterial.findMany();

    let importedSales = 0;
    let importedBudgets = 0;
    let totalRevenue = 0;
    let totalCosts = 0;
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = splitCsvLine(line, delimiter);

      const productName = colIndex.produto !== -1 ? cols[colIndex.produto]?.trim() : "";
      if (!productName) continue;

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
      const totalMinutes = Math.max(1, hours * 60 + minutes);

      const rawValorVendido =
        colIndex.valorVendido !== -1 ? cols[colIndex.valorVendido]?.trim() : "";
      const numericVendido = parseNumber(rawValorVendido);

      // Se "Valor Vendido" estiver preenchido e for > 0, é venda efetiva. Senão é orçamento.
      const isSale = Boolean(rawValorVendido && numericVendido > 0);
      const finalPrice = isSale ? numericVendido : null;

      const customerName =
        colIndex.cliente !== -1 && cols[colIndex.cliente]?.trim()
          ? cols[colIndex.cliente].trim()
          : null;

      try {
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
          importedSales++;
          totalRevenue += finalPrice;
          totalCosts += calc.totalCost;
        } else {
          importedBudgets++;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        errors.push(`Linha ${i + 1} (${productName}): ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      importedSales,
      importedBudgets,
      totalImported: importedSales + importedBudgets,
      totalRevenue,
      totalCosts,
      totalProfit: totalRevenue - totalCosts,
      errors: errors.slice(0, 10),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno de importação";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
