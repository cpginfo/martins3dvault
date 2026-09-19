import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (user && user.role === "VIEWER") {
      return NextResponse.json({ error: "Permissão insuficiente para alterar modelos da coleção" }, { status: 403 });
    }

    const { id } = await props.params;
    const body = await request.json();
    const { modelIds, action } = body; // action: "add" | "remove"

    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return NextResponse.json({ error: "Lista de modelIds é obrigatória" }, { status: 400 });
    }

    const collection = await prisma.collection.findUnique({
      where: { id },
    });

    if (!collection) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    if (action === "remove") {
      await prisma.model.updateMany({
        where: {
          id: { in: modelIds },
          collectionId: id,
        },
        data: {
          collectionId: null,
        },
      });
    } else {
      // action === "add"
      await prisma.model.updateMany({
        where: {
          id: { in: modelIds },
        },
        data: {
          collectionId: id,
        },
      });
    }

    return NextResponse.json({ success: true, count: modelIds.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
