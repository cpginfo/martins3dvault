import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculatePrintCost } from "@/lib/pricing/calculator";
import { PrinterConfig, AccessoryItem } from "@/lib/pricing/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const budget = await prisma.printBudget.findUnique({
      where: { id },
      include: {
        accessories: {
          orderBy: { createdAt: "asc" },
        },
        material: true,
      },
    });

    if (!budget) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.printBudget.findUnique({
      where: { id },
      include: { accessories: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Orçamento não encontrado." }, { status: 404 });
    }

    const body = await request.json();

    // Caso de uso 1: Apenas marcar/desmarcar como venda (ou alterar preço real vendido)
    if (body.toggleSaleOnly) {
      const isSale = Boolean(body.isSale);
      const finalPrice =
        body.finalPrice !== null && body.finalPrice !== undefined
          ? Math.max(0, Number(body.finalPrice))
          : null;

      let actualProfit: number | null = null;
      let priceDifference: number | null = null;

      if (isSale && finalPrice !== null) {
        actualProfit = finalPrice - existing.totalCost;
        priceDifference = finalPrice - existing.suggestedPrice;
      }

      const updated = await prisma.printBudget.update({
        where: { id },
        data: {
          isSale,
          finalPrice: isSale ? finalPrice : null,
          actualProfit: isSale ? actualProfit : null,
          priceDifference: isSale ? priceDifference : null,
          soldAt: isSale ? (body.soldAt ? new Date(body.soldAt) : new Date()) : null,
        },
        include: {
          accessories: true,
          material: true,
        },
      });

      return NextResponse.json(updated);
    }

    // Caso de uso 2: Edição completa com recálculo
    const {
      productName,
      customerName,
      printTimeHours = 0,
      printTimeMinutes = 0,
      weightGrams = 0,
      materialId,
      materialName,
      materialCostPerKg = 0,
      modelingTimeHours = 0,
      modelingTimeMinutes = 0,
      assemblyTimeHours = 0,
      assemblyTimeMinutes = 0,
      markupPercent = 100,
      accessories = [],
      isSale = false,
      finalPrice = null,
      notes = null,
    } = body;

    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: "O nome do produto/peça é obrigatório." }, { status: 400 });
    }

    let finalMaterialCostPerKg = Number(materialCostPerKg);
    let resolvedMaterialName = materialName ? materialName.trim() : existing.materialName;

    if (materialId) {
      const mat = await prisma.printMaterial.findUnique({ where: { id: materialId } });
      if (mat) {
        finalMaterialCostPerKg = mat.costPerKg;
        resolvedMaterialName = mat.name;
      }
    }

    const settings = await prisma.printerSettings.findFirst({
      where: { isDefault: true },
    });

    const printerConfig: PrinterConfig = settings || {
      printerCost: existing.printerCost,
      powerWatts: existing.powerWatts,
      lifespanHours: existing.lifespanHours,
      electricityKwhCost: existing.electricityKwhCost,
      manualHourlyRate: existing.manualHourlyRate,
      defaultMarkup: existing.markupPercent,
    };

    const calculation = calculatePrintCost(
      {
        productName: productName.trim(),
        customerName: customerName ? customerName.trim() : null,
        printTimeHours: Number(printTimeHours),
        printTimeMinutes: Number(printTimeMinutes),
        weightGrams: Number(weightGrams),
        materialCostPerKg: finalMaterialCostPerKg,
        modelingTimeHours: Number(modelingTimeHours),
        modelingTimeMinutes: Number(modelingTimeMinutes),
        assemblyTimeHours: Number(assemblyTimeHours),
        assemblyTimeMinutes: Number(assemblyTimeMinutes),
        markupPercent: Number(markupPercent),
        accessories,
        isSale: Boolean(isSale),
        finalPrice: finalPrice !== null && finalPrice !== undefined ? Number(finalPrice) : null,
      },
      printerConfig
    );

    // Remove acessórios antigos e recria os novos em transação
    await prisma.$transaction([
      prisma.printBudgetAccessory.deleteMany({ where: { budgetId: id } }),
      prisma.printBudget.update({
        where: { id },
        data: {
          productName: productName.trim(),
          customerName: customerName && customerName.trim() ? customerName.trim() : null,
          printTimeMinutes: calculation.totalPrintTimeMinutes,
          weightGrams: Number(weightGrams),

          materialId: materialId || null,
          materialName: resolvedMaterialName,
          materialCostPerKg: finalMaterialCostPerKg,

          modelingTimeMinutes: Number(modelingTimeHours) * 60 + Number(modelingTimeMinutes),
          assemblyTimeMinutes: Number(assemblyTimeHours) * 60 + Number(assemblyTimeMinutes),
          markupPercent: Number(markupPercent),

          energyCost: calculation.energyCost,
          depreciationCost: calculation.depreciationCost,
          materialCost: calculation.materialCost,
          laborCost: calculation.laborCost,
          accessoriesCost: calculation.accessoriesCost,
          totalCost: calculation.totalCost,
          suggestedPrice: calculation.suggestedPrice,
          simulatedProfit: calculation.simulatedProfit,

          isSale: calculation.isSale,
          finalPrice: calculation.finalPrice,
          actualProfit: calculation.actualProfit,
          priceDifference: calculation.priceDifference,
          soldAt: calculation.isSale ? (existing.soldAt || new Date()) : null,

          notes: notes ? notes.trim() : null,

          accessories: {
            create: (accessories || []).map((acc: AccessoryItem) => ({
              name: acc.name.trim(),
              unitPrice: Number(acc.unitPrice) || 0,
              quantity: Number(acc.quantity) || 1,
              totalPrice: (Number(acc.unitPrice) || 0) * (Number(acc.quantity) || 1),
            })),
          },
        },
      }),
    ]);

    const updated = await prisma.printBudget.findUnique({
      where: { id },
      include: {
        accessories: true,
        material: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.printBudget.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
