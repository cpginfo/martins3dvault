import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const collections = await prisma.collection.findMany({
      include: {
        _count: {
          select: { models: true },
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
        description: col.description,
        coverImage: cover,
        modelsCount: col._count.models,
        previewThumbnails: col.models.map((m) => m.coverImage).filter(Boolean),
        createdAt: col.createdAt,
        updatedAt: col.updatedAt,
      };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const { name, description, coverImage } = await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Nome da coleção é obrigatório" }, { status: 400 });
    }

    const slug = name
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const existing = await prisma.collection.findUnique({
      where: { slug },
    });

    if (existing) {
      return NextResponse.json({ error: "Já existe uma coleção com este nome" }, { status: 409 });
    }

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
        slug,
        description: description?.trim() || null,
        coverImage: coverImage?.trim() || null,
      },
    });

    return NextResponse.json(collection, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
