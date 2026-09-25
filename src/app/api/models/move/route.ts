import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOperator, handleAuthError } from "@/lib/auth/session";
import {
  ensureCollectionFolder,
  moveModelToCollection,
  sanitizeFileName,
} from "@/lib/storage/file-ops";

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "colecao";
}

export async function POST(request: Request) {
  try {
    await requireOperator(request);

    const body = await request.json();
    const { modelIds, targetCollectionId, newCollectionName, newCollectionDesc } = body;

    if (!Array.isArray(modelIds) || modelIds.length === 0) {
      return NextResponse.json(
        { error: "A lista de modelIds é obrigatória e deve conter pelo menos 1 item." },
        { status: 400 }
      );
    }

    let finalCollectionId = targetCollectionId || null;

    // Se o usuário solicitou criar uma nova coleção na hora da movimentação
    if (newCollectionName && typeof newCollectionName === "string" && newCollectionName.trim()) {
      const cleanName = sanitizeFileName(newCollectionName.trim());
      const slug = slugify(cleanName);

      let collection = await prisma.collection.findUnique({
        where: { slug },
      });

      if (!collection) {
        collection = await prisma.collection.create({
          data: {
            name: cleanName,
            slug,
            description: newCollectionDesc?.trim() || null,
          },
        });
      }

      // Cria fisicamente a pasta no repositório
      await ensureCollectionFolder(collection.name);
      finalCollectionId = collection.id;
    }

    const movedResults = [];
    const errors = [];

    for (const modelId of modelIds) {
      try {
        const moved = await moveModelToCollection(modelId, finalCollectionId);
        movedResults.push(moved);
      } catch (err: any) {
        console.error(`Erro ao mover modelo ${modelId}:`, err);
        errors.push({ modelId, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      count: movedResults.length,
      targetCollectionId: finalCollectionId,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro na rota de movimentação de modelos:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
