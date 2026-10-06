import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError, isOperator } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(undefined, request);

    const body = await request.json();
    const { action, modelIds, value, collectionId } = body;

    if (!action || !Array.isArray(modelIds) || modelIds.length === 0) {
      return NextResponse.json(
        { error: "Ação inválida ou nenhum modelo selecionado" },
        { status: 400 }
      );
    }

    // 1. Marcar como impresso / não impresso em lote
    if (action === "set_printed") {
      const isPrinted = Boolean(value);
      const res = await prisma.model.updateMany({
        where: { id: { in: modelIds } },
        data: {
          isPrinted,
          printedAt: isPrinted ? new Date() : null,
        },
      });

      // Também sincroniza as peças dos modelos
      await prisma.modelFile.updateMany({
        where: { modelId: { in: modelIds } },
        data: { isPrinted },
      });

      return NextResponse.json({
        success: true,
        action: "set_printed",
        count: res.count,
        message: `${res.count} modelo(s) atualizado(s)`,
      });
    }

    // 2. Favoritar / desfavoritar em lote
    if (action === "set_favorite") {
      const isFavorite = Boolean(value);
      const res = await prisma.model.updateMany({
        where: { id: { in: modelIds } },
        data: { isFavorite },
      });

      return NextResponse.json({
        success: true,
        action: "set_favorite",
        count: res.count,
        message: `${res.count} modelo(s) atualizado(s)`,
      });
    }

    // 3. Mover para coleção em lote (Requer permissão de operador ou admin)
    if (action === "move_collection") {
      if (!isOperator(user)) {
        return NextResponse.json(
          { error: "Permissão insuficiente para mover modelos em lote" },
          { status: 403 }
        );
      }

      const targetColId = collectionId ? String(collectionId) : null;
      if (targetColId) {
        const targetCol = await prisma.collection.findUnique({
          where: { id: targetColId },
        });
        if (!targetCol) {
          return NextResponse.json({ error: "Coleção de destino não encontrada" }, { status: 404 });
        }
      }

      const res = await prisma.model.updateMany({
        where: { id: { in: modelIds } },
        data: { collectionId: targetColId },
      });

      return NextResponse.json({
        success: true,
        action: "move_collection",
        count: res.count,
        message: `${res.count} modelo(s) movido(s) com sucesso`,
      });
    }

    // 4. Excluir modelos em lote (Requer permissão de operador ou admin)
    if (action === "delete") {
      if (!isOperator(user)) {
        return NextResponse.json(
          { error: "Permissão insuficiente para excluir modelos em lote" },
          { status: 403 }
        );
      }

      const res = await prisma.model.deleteMany({
        where: { id: { in: modelIds } },
      });

      return NextResponse.json({
        success: true,
        action: "delete",
        count: res.count,
        message: `${res.count} modelo(s) excluído(s) do catálogo`,
      });
    }

    return NextResponse.json({ error: "Ação não suportada" }, { status: 400 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro na rota de ações em lote:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao processar operação em lote" },
      { status: 500 }
    );
  }
}
