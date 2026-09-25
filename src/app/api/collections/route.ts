import path from "path";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, requireOperator, handleAuthError } from "@/lib/auth/session";
import {
  ensureCollectionFolder,
  sanitizeFileName,
  slugifyCollection,
  getCollectionFolderPath,
} from "@/lib/storage/file-ops";

export async function GET(request: Request) {
  try {
    await requireAuth(undefined, request);
    const { searchParams } = new URL(request.url);
    const isTree = searchParams.get("tree") === "true";

    const collections = await prisma.collection.findMany({
      include: {
        _count: {
          select: { models: true, children: true },
        },
        models: {
          take: 4,
          select: {
            id: true,
            name: true,
            coverImage: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    // Se coverImage da coleção for nula, usa a capa do primeiro modelo com capa
    const enriched = collections.map((col) => {
      let cover = col.coverImage;
      if (!cover && col.models.length > 0) {
        const firstWithCover = col.models.find((m) => !!m.coverImage);
        if (firstWithCover) {
          cover = firstWithCover.coverImage;
        }
      }
      return {
        id: col.id,
        name: col.name,
        slug: col.slug,
        folderPath: col.folderPath,
        parentId: col.parentId,
        description: col.description,
        coverImage: cover,
        modelsCount: col._count.models,
        childrenCount: col._count.children,
        previewThumbnails: col.models.map((m) => m.coverImage).filter(Boolean),
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
      };
    });

    if (isTree) {
      // Monta estrutura em árvore recursiva para navegação
      const itemMap = new Map<string, any>();
      enriched.forEach((col) => {
        itemMap.set(col.id, { ...col, children: [] });
      });

      const roots: any[] = [];
      enriched.forEach((col) => {
        const node = itemMap.get(col.id);
        if (col.parentId && itemMap.has(col.parentId)) {
          itemMap.get(col.parentId).children.push(node);
        } else {
          roots.push(node);
        }
      });

      return NextResponse.json(roots);
    }

    return NextResponse.json(enriched);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireOperator(request);

    const { name, description, coverImage, parentId } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nome da coleção é obrigatório" }, { status: 400 });
    }

    const cleanName = sanitizeFileName(name);
    let parentCol = null;
    let folderPath = cleanName;
    let baseSlug = slugifyCollection(name);

    if (parentId) {
      parentCol = await prisma.collection.findUnique({
        where: { id: parentId },
      });
      if (!parentCol) {
        return NextResponse.json({ error: "Coleção pai informada não existe" }, { status: 404 });
      }

      const parentFolderPath = await getCollectionFolderPath(parentId);
      folderPath = parentFolderPath ? path.join(parentFolderPath, cleanName) : cleanName;
      baseSlug = `${parentCol.slug}-${slugifyCollection(name)}`;
    }

    let slug = baseSlug;
    const existingSlug = await prisma.collection.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      slug = `${baseSlug}-${Date.now().toString(36)}`;
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        slug,
        folderPath,
        parentId: parentId || null,
        description: description?.trim() || null,
        coverImage: coverImage?.trim() || null,
      },
    });

    // Cria a pasta física no repositório de arquivos
    try {
      await ensureCollectionFolder(collection.name, undefined, parentId || null);
    } catch (fsErr) {
      console.warn("Aviso ao criar pasta física da coleção:", fsErr);
    }

    return NextResponse.json(collection, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
