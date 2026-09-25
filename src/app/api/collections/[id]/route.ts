import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireOperator, handleAuthError } from "@/lib/auth/session";
import { renameCollectionFolder } from "@/lib/storage/file-ops";

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

    const sanitizedModels = collection.models.map((m) => ({
      ...m,
      files: m.files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
    }));

    return NextResponse.json({
      ...collection,
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

    // Prisma já está configurado com onDelete: SetNull na relação collection -> models
    await prisma.collection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
