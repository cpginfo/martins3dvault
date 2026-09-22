import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, costPerKg, density, color, brand } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "O nome do material é obrigatório." }, { status: 400 });
    }

    const numericCost = Number(costPerKg);
    if (isNaN(numericCost) || numericCost <= 0) {
      return NextResponse.json({ error: "O custo por kg deve ser maior que zero." }, { status: 400 });
    }

    const updated = await prisma.printMaterial.update({
      where: { id },
      data: {
        name: name.trim(),
        costPerKg: numericCost,
        density: density ? Number(density) : undefined,
        color: color ? color.trim() : null,
        brand: brand ? brand.trim() : null,
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
    await prisma.printMaterial.delete({
      where: { id },
    });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
