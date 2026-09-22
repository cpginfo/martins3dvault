import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { calculatePrintCost } from "@/lib/pricing/calculator";
import { PrinterConfig, AccessoryItem } from "@/lib/pricing/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const filter = searchParams.get("filter") || "all"; // all, budgets, sales

    const where: Prisma.PrintBudgetWhereInput = {};

    if (filter === "budgets") {
      where.isSale = false;
    } else if (filter === "sales") {
      where.isSale = true;
    }

    if (search) {
      where.OR = [
        { productName: { contains: search, mode: "insensitive" } },
        { customerName: { contains: search, mode: "insensitive" } },
        { materialName: { contains: search, mode: "insensitive" } },
      ];
    }

    const budgets = await prisma.printBudget.findMany({
      where,
      include: {
        accessories: {
          orderBy: { createdAt: "asc" },
        },
        material: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(budgets);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    // Validações obrigatórias
    if (!productName || !productName.trim()) {
      return NextResponse.json({ error: "O nome do produto/peça é obrigatório." }, { status: 400 });
    }

    const totalPrintMinutes = Number(printTimeHours) * 60 + Number(printTimeMinutes);
    if (totalPrintMinutes <= 0) {
      return NextResponse.json({ error: "O tempo de impressão deve ser maior que zero." }, { status: 400 });
    }

    if (Number(weightGrams) <= 0) {
      return NextResponse.json({ error: "O peso da peça deve ser maior que zero." }, { status: 400 });
    }

    let finalMaterialCostPerKg = Number(materialCostPerKg);
    let resolvedMaterialName = materialName ? materialName.trim() : "Filamento Padrão";

    if (materialId) {
      const mat = await prisma.printMaterial.findUnique({ where: { id: materialId } });
      if (mat) {
        finalMaterialCostPerKg = mat.costPerKg;
        resolvedMaterialName = mat.name;
      }
    }

    if (finalMaterialCostPerKg <= 0) {
      return NextResponse.json({ error: "O custo por kg do material deve ser maior que zero." }, { status: 400 });
    }

    // Busca configurações da impressora
    let settings = await prisma.printerSettings.findFirst({
      where: { isDefault: true },
    });

    if (!settings) {
      settings = await prisma.printerSettings.create({
        data: {
          printerName: "Impressora 3D Principal",
          printerCost: 2500.0,
          powerWatts: 250.0,
          lifespanHours: 3000.0,
          electricityKwhCost: 0.85,
          manualHourlyRate: 35.0,
          defaultMarkup: 100.0,
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

    // Calcula os custos de forma pura no servidor
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

    // Criação transacional do orçamento e acessórios
    const created = await prisma.printBudget.create({
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

        // Snapshots dos parâmetros da máquina
        powerWatts: printerConfig.powerWatts,
        electricityKwhCost: printerConfig.electricityKwhCost,
        printerCost: printerConfig.printerCost,
        lifespanHours: printerConfig.lifespanHours,
        manualHourlyRate: printerConfig.manualHourlyRate,

        // Custos calculados
        energyCost: calculation.energyCost,
        depreciationCost: calculation.depreciationCost,
        materialCost: calculation.materialCost,
        laborCost: calculation.laborCost,
        accessoriesCost: calculation.accessoriesCost,
        totalCost: calculation.totalCost,
        suggestedPrice: calculation.suggestedPrice,
        simulatedProfit: calculation.simulatedProfit,

        // Venda
        isSale: calculation.isSale,
        finalPrice: calculation.finalPrice,
        actualProfit: calculation.actualProfit,
        priceDifference: calculation.priceDifference,
        soldAt: calculation.isSale ? new Date() : null,

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
      include: {
        accessories: true,
        material: true,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
