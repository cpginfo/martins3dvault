import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;

    const collection = await prisma.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        _count: {
          select: { models: true },
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

    const sanitizedModels = collection.models.map((m) => ({
      ...m,
      files: m.files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
    }));

    return NextResponse.json({
      ...collection,
      models: sanitizedModels,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (user && user.role === "VIEWER") {
      return NextResponse.json({ error: "Permissão insuficiente para editar coleções" }, { status: 403 });
    }

    const { id } = await props.params;
    const body = await request.json();
    const { name, description, coverImage } = body;

    const data: any = {};
    if (name !== undefined) {
      data.name = name.trim();
      data.slug = name
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }
    if (description !== undefined) data.description = description ? description.trim() : null;
    if (coverImage !== undefined) data.coverImage = coverImage ? coverImage.trim() : null;

    const updated = await prisma.collection.update({
      where: { id },
      data,
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (user && user.role !== "ADMIN") {
      return NextResponse.json({ error: "Apenas administradores podem excluir coleções" }, { status: 403 });
    }

    const { id } = await props.params;

    // Prisma já está configurado com onDelete: SetNull na relação collection -> models
    await prisma.collection.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
