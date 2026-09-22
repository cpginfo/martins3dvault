import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { calculateSalesMetrics } from "@/lib/pricing/calculator";
import { SaleRecord } from "@/lib/pricing/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "all"; // month, 30days, all

    const where: Prisma.PrintBudgetWhereInput = {
      isSale: true,
      finalPrice: { not: null, gt: 0 },
    };

    const now = new Date();

    if (period === "month") {
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      where.OR = [
        { soldAt: { gte: firstDayOfMonth } },
        { AND: [{ soldAt: null }, { createdAt: { gte: firstDayOfMonth } }] },
      ];
    } else if (period === "30days") {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      where.OR = [
        { soldAt: { gte: thirtyDaysAgo } },
        { AND: [{ soldAt: null }, { createdAt: { gte: thirtyDaysAgo } }] },
      ];
    }

    const sales = await prisma.printBudget.findMany({
      where,
      select: {
        id: true,
        productName: true,
        customerName: true,
        materialName: true,
        finalPrice: true,
        totalCost: true,
        actualProfit: true,
        priceDifference: true,
        isSale: true,
        soldAt: true,
        createdAt: true,
      },
      orderBy: [
        { soldAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    interface BudgetStatItem {
      isSale: boolean;
      finalPrice: number | null;
      totalCost: number;
      soldAt: Date | null;
      createdAt: Date;
    }

    const saleRecords: SaleRecord[] = (sales as unknown as BudgetStatItem[]).map((s) => ({
      isSale: s.isSale,
      finalPrice: s.finalPrice,
      totalCost: s.totalCost,
      soldAt: s.soldAt,
      createdAt: s.createdAt,
    }));

    const metrics = calculateSalesMetrics(saleRecords);

    return NextResponse.json({
      period,
      metrics,
      recentSales: sales.slice(0, 15),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
