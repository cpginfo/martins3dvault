import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
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

    return NextResponse.json(settings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const {
      printerName,
      printerCost,
      powerWatts,
      lifespanHours,
      electricityKwhCost,
      manualHourlyRate,
      defaultMarkup,
    } = body;

    // Validações
    if (
      Number(printerCost) < 0 ||
      Number(powerWatts) < 0 ||
      Number(lifespanHours) <= 0 ||
      Number(electricityKwhCost) < 0 ||
      Number(manualHourlyRate) < 0 ||
      Number(defaultMarkup) < 0
    ) {
      return NextResponse.json(
        { error: "Valores numéricos não podem ser negativos e a vida útil deve ser maior que zero." },
        { status: 400 }
      );
    }

    const existing = await prisma.printerSettings.findFirst({
      where: { isDefault: true },
    });

    let updated;
    if (existing) {
      updated = await prisma.printerSettings.update({
        where: { id: existing.id },
        data: {
          printerName: printerName || "Impressora 3D Principal",
          printerCost: Number(printerCost),
          powerWatts: Number(powerWatts),
          lifespanHours: Number(lifespanHours),
          electricityKwhCost: Number(electricityKwhCost),
          manualHourlyRate: Number(manualHourlyRate),
          defaultMarkup: Number(defaultMarkup),
        },
      });
    } else {
      updated = await prisma.printerSettings.create({
        data: {
          printerName: printerName || "Impressora 3D Principal",
          printerCost: Number(printerCost),
          powerWatts: Number(powerWatts),
          lifespanHours: Number(lifespanHours),
          electricityKwhCost: Number(electricityKwhCost),
          manualHourlyRate: Number(manualHourlyRate),
          defaultMarkup: Number(defaultMarkup),
          isDefault: true,
        },
      });
    }

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
