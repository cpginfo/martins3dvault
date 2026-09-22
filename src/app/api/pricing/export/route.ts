import { NextResponse } from "next/server";
import rawPrisma from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = rawPrisma as any;

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDecimalBR(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "0,00";
  return val.toFixed(2).replace(".", ",");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "sales"; // "sales" ou "all"

    const where: { isSale?: boolean } = {};
    if (type === "sales") {
      where.isSale = true;
    }

    const budgets = await prisma.printBudget.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    const headers = [
      "Produto",
      "Cliente",
      "Material",
      "Custo/kg (R$)",
      "Material gasto (g)",
      "Tempo de impressão (horas)",
      "Tempo de impressão (minutos)",
      "Tempo Total",
      "Custo Energia (R$)",
      "Custo Depreciação (R$)",
      "Custo Material (R$)",
      "Custo Mão de Obra (R$)",
      "Custo Acessórios (R$)",
      "Custo Total (R$)",
      "Preço Sugerido (R$)",
      "Valor Vendido (R$)",
      "Lucro Real (R$)",
      "Margem (%)",
      "Data da Venda",
      "Data do Orçamento",
      "Observações",
    ];

    const rows: string[] = [];
    rows.push(headers.map(escapeCsvField).join(";"));

    for (const b of budgets) {
      const hours = Math.floor((b.printTimeMinutes || 0) / 60);
      const minutes = (b.printTimeMinutes || 0) % 60;
      const totalTimeStr = `${hours}h ${minutes}m`;

      const marginPct =
        b.finalPrice && b.finalPrice > 0 && b.actualProfit !== null
          ? ((b.actualProfit / b.finalPrice) * 100).toFixed(1).replace(".", ",") + "%"
          : "0,0%";

      const soldAtStr = b.soldAt
        ? new Date(b.soldAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const createdAtStr = b.createdAt
        ? new Date(b.createdAt).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

      const row = [
        b.productName,
        b.customerName || "",
        b.materialName || "",
        formatDecimalBR(b.materialCostPerKg),
        b.weightGrams ? b.weightGrams.toString().replace(".", ",") : "0",
        hours.toString(),
        minutes.toString(),
        totalTimeStr,
        formatDecimalBR(b.energyCost),
        formatDecimalBR(b.depreciationCost),
        formatDecimalBR(b.materialCost),
        formatDecimalBR(b.laborCost),
        formatDecimalBR(b.accessoriesCost),
        formatDecimalBR(b.totalCost),
        formatDecimalBR(b.suggestedPrice),
        formatDecimalBR(b.finalPrice),
        formatDecimalBR(b.actualProfit),
        marginPct,
        soldAtStr,
        createdAtStr,
        b.notes || "",
      ];

      rows.push(row.map(escapeCsvField).join(";"));
    }

    // Adiciona BOM UTF-8 (\uFEFF) para abrir com acentuação perfeita no Excel
    const csvData = "\uFEFF" + rows.join("\r\n");

    const today = new Date().toISOString().split("T")[0];
    const filename =
      type === "sales"
        ? `vendas_3d_vault_${today}.csv`
        : `orcamentos_e_vendas_${today}.csv`;

    return new Response(csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
