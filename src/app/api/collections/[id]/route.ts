import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireOperator, handleAuthError } from "@/lib/auth/session";
import { renameCollectionFolder, deleteCollectionFolder } from "@/lib/storage/file-ops";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth(undefined, request);
    const { id } = await props.params;

    const collection = await prisma.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        parent: {
          select: { id: true, name: true, slug: true, parentId: true, folderPath: true },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
            folderPath: true,
            coverImage: true,
            _count: {
              select: { models: true, children: true },
            },
          },
          orderBy: { name: "asc" },
        },
        _count: {
          select: { models: true, children: true },
        },
        models: {
          include: {
            library: { select: { id: true, name: true } },
            tags: true,
            files: {
              select: {
                id: true,
                fileName: true,
                format: true,
                fileSize: true,
                isPrimary: true,
              },
            },
            _count: {
              select: { files: true, assets: true },
            },
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    // Constrói trilha de navegação (breadcrumbs) recursivamente até a raiz
    const breadcrumbs: Array<{ id: string; name: string; slug: string }> = [];
    let currParentId = collection.parentId;
    while (currParentId) {
      const p = await prisma.collection.findUnique({
        where: { id: currParentId },
        select: { id: true, name: true, slug: true, parentId: true },
      });
      if (!p) break;
      breadcrumbs.unshift({ id: p.id, name: p.name, slug: p.slug });
      currParentId = p.parentId;
    }

    // Calcula contagem recursiva de modelos incluindo subpastas
    const allCollections = await prisma.collection.findMany({
      select: { id: true, parentId: true, _count: { select: { models: true } } },
    });

    const childrenMap = new Map<string, string[]>();
    const directCountMap = new Map<string, number>();

    allCollections.forEach((c) => {
      directCountMap.set(c.id, c._count.models);
      if (c.parentId) {
        const list = childrenMap.get(c.parentId) || [];
        list.push(c.id);
        childrenMap.set(c.parentId, list);
      }
    });

    const recursiveCountMemo = new Map<string, number>();
    function getRecursiveModelsCount(targetId: string, visited = new Set<string>()): number {
      if (recursiveCountMemo.has(targetId)) return recursiveCountMemo.get(targetId)!;
      if (visited.has(targetId)) return 0;
      visited.add(targetId);

      let total = directCountMap.get(targetId) || 0;
      const childIds = childrenMap.get(targetId) || [];
      for (const childId of childIds) {
        total += getRecursiveModelsCount(childId, visited);
      }
      recursiveCountMemo.set(targetId, total);
      return total;
    }

    const sanitizedChildren = collection.children.map((child) => ({
      ...child,
      modelsCount: getRecursiveModelsCount(child.id),
      directModelsCount: child._count.models,
    }));

    const sanitizedModels = collection.models.map((m) => ({
      ...m,
      files: m.files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
    }));

    return NextResponse.json({
      ...collection,
      children: sanitizedChildren,
      modelsCount: getRecursiveModelsCount(collection.id),
      directModelsCount: collection._count.models,
      breadcrumbs,
      models: sanitizedModels,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator(request);

    const { id } = await props.params;
    const body = await request.json();
    const { name, description, coverImage } = body;

    const existing = await prisma.collection.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!existing) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    // Se o nome mudou, executa a renomeação física da pasta e cascata de caminhos
    if (name && name.trim() !== existing.name) {
      await renameCollectionFolder(existing.id, name.trim());
    }

    const data: any = {};
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (coverImage !== undefined) data.coverImage = coverImage ? coverImage.trim() : null;

    const updated = await prisma.collection.update({
      where: { id: existing.id },
      data,
    });

    return NextResponse.json(updated);
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
    await requireOperator(request);

    const { id } = await props.params;

    const existing = await prisma.collection.findFirst({
      where: { OR: [{ id }, { slug: id }] },
    });

    if (!existing) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const deletePhysicalFiles = searchParams.get("deleteFiles") === "true";

    // 1. Exclui a pasta física no disco apenas se explicitamente solicitado pelo operador
    if (deletePhysicalFiles) {
      await deleteCollectionFolder(existing.id);
    }

    // 2. Remove a coleção do banco de dados (Prisma cuida dos modelos com SetNull)
    await prisma.collection.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({
      success: true,
      physicalFilesDeleted: deletePhysicalFiles,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
