import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";
import { renameModelFiles, moveModelToCollection } from "@/lib/storage/file-ops";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await props.params;

    const model = await prisma.model.findUnique({
      where: { id },
      include: {
        library: true,
        collection: true,
        tags: true,
        files: {
          orderBy: [{ isPrimary: "desc" }, { fileName: "asc" }],
        },
        assets: {
          orderBy: { fileName: "asc" },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
    }

    const sanitized = {
      ...model,
      files: model.files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
      assets: model.assets.map((a) => ({
        ...a,
        fileSize: Number(a.fileSize),
      })),
    };

    return NextResponse.json(sanitized);
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
    await requireAdmin(request);

    const { id } = await props.params;
    const body = await request.json();

    const {
      name,
      description,
      filamentType,
      nozzleSize,
      infillDensity,
      layerHeight,
      printTimeMinutes,
      notes,
      isFavorite,
      isPrinted,
      printedAt,
      coverImage,
      collectionId,
      tags, // array de strings
    } = body;

    const currentModel = await prisma.model.findUnique({
      where: { id },
    });
    if (!currentModel) {
      return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
    }

    // Se o nome foi alterado, renomeia fisicamente o modelo e seus arquivos no disco
    if (name !== undefined && name.trim() && name.trim() !== currentModel.name) {
      await renameModelFiles(id, name.trim());
    }

    // Se a coleção foi alterada, move fisicamente os arquivos no disco
    const targetColId = collectionId !== undefined ? (collectionId || null) : currentModel.collectionId;
    if (collectionId !== undefined && targetColId !== currentModel.collectionId) {
      await moveModelToCollection(id, targetColId);
    }

    const data: any = {};
    if (description !== undefined) data.description = description;
    if (filamentType !== undefined) data.filamentType = filamentType;
    if (nozzleSize !== undefined) data.nozzleSize = nozzleSize ? parseFloat(nozzleSize) : null;
    if (infillDensity !== undefined) data.infillDensity = infillDensity ? parseInt(infillDensity) : null;
    if (layerHeight !== undefined) data.layerHeight = layerHeight ? parseFloat(layerHeight) : null;
    if (printTimeMinutes !== undefined) data.printTimeMinutes = printTimeMinutes ? parseInt(printTimeMinutes) : null;
    if (notes !== undefined) data.notes = notes;
    if (isFavorite !== undefined) data.isFavorite = Boolean(isFavorite);
    if (isPrinted !== undefined) {
      data.isPrinted = Boolean(isPrinted);
      if (data.isPrinted && printedAt === undefined) {
        data.printedAt = new Date();
      } else if (!data.isPrinted && printedAt === undefined) {
        data.printedAt = null;
      }
    }
    if (printedAt !== undefined) {
      data.printedAt = printedAt ? new Date(printedAt) : null;
    }
    if (coverImage !== undefined) data.coverImage = coverImage;

    // Atualiza tags se fornecido
    if (Array.isArray(tags)) {
      data.tags = {
        set: [], // limpa anteriores
        connectOrCreate: tags.map((tagName: string) => ({
          where: { name: tagName.trim() },
          create: {
            name: tagName.trim(),
            slug: tagName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          },
        })),
      };
    }

    let updated = await prisma.model.update({
      where: { id },
      data,
      include: {
        collection: true,
        tags: true,
        files: true,
        assets: true,
      },
    });

    return NextResponse.json({
      ...updated,
      files: updated.files.map((f) => ({ ...f, fileSize: Number(f.fileSize) })),
      assets: updated.assets.map((a) => ({ ...a, fileSize: Number(a.fileSize) })),
    });
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

    await prisma.model.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
