import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const DEFAULT_MATERIALS = [
  { name: "PLA Standard", costPerKg: 110.0, density: 1.24 },
  { name: "PETG", costPerKg: 130.0, density: 1.27 },
  { name: "ABS", costPerKg: 120.0, density: 1.04 },
  { name: "TPU 95A (Flex)", costPerKg: 180.0, density: 1.21 },
  { name: "Resina Standard", costPerKg: 160.0, density: 1.15 },
];

export async function GET() {
  try {
    let materials = await prisma.printMaterial.findMany({
      orderBy: { name: "asc" },
    });

    if (materials.length === 0) {
      await prisma.printMaterial.createMany({
        data: DEFAULT_MATERIALS,
      });
      materials = await prisma.printMaterial.findMany({
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json(materials);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, costPerKg, density, color, brand } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "O nome do material é obrigatório." }, { status: 400 });
    }

    const numericCost = Number(costPerKg);
    if (isNaN(numericCost) || numericCost <= 0) {
      return NextResponse.json({ error: "O custo por kg deve ser maior que zero." }, { status: 400 });
    }

    const created = await prisma.printMaterial.create({
      data: {
        name: name.trim(),
        costPerKg: numericCost,
        density: density ? Number(density) : 1.24,
        color: color ? color.trim() : null,
        brand: brand ? brand.trim() : null,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
