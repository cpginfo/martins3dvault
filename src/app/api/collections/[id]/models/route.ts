import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";
import { moveModelToCollection } from "@/lib/storage/file-ops";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

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

    const targetCollectionId = action === "remove" ? null : id;

    for (const modelId of modelIds) {
      try {
        await moveModelToCollection(modelId, targetCollectionId);
      } catch (err) {
        console.error(`Erro ao mover modelo ${modelId}:`, err);
      }
    }

    return NextResponse.json({ success: true, count: modelIds.length });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await props.params;
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get("modelId");

    if (!modelId) {
      return NextResponse.json({ error: "modelId é obrigatório" }, { status: 400 });
    }

    // Move fisicamente o modelo para fora da coleção (raiz da biblioteca)
    await moveModelToCollection(modelId, null);

    return NextResponse.json({ success: true, modelId });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
