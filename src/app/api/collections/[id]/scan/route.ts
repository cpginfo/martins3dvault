import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { scanLibrary } from "@/lib/scanner/crawler";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await props.params;

    const collection = await prisma.collection.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
      },
      include: {
        models: {
          select: { libraryId: true, folderPath: true },
          take: 5,
        },
      },
    });

    if (!collection) {
      return NextResponse.json({ error: "Coleção não encontrada" }, { status: 404 });
    }

    const libraries = await prisma.library.findMany({
      where: { enabled: true },
    });

    if (libraries.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma biblioteca ativa encontrada" },
        { status: 400 }
      );
    }

    // 1. Tenta encontrar a pasta física direta correspondente ao nome ou slug da coleção
    let targetLibraryId: string | null = null;
    let targetSubFolder: string | undefined = undefined;

    for (const lib of libraries) {
      const libRoot = path.resolve(lib.path);
      if (!fs.existsSync(libRoot)) continue;

      const directByName = path.join(libRoot, collection.name);
      if (fs.existsSync(directByName) && fs.statSync(directByName).isDirectory()) {
        targetLibraryId = lib.id;
        targetSubFolder = collection.name;
        break;
      }

      const directBySlug = path.join(libRoot, collection.slug);
      if (fs.existsSync(directBySlug) && fs.statSync(directBySlug).isDirectory()) {
        targetLibraryId = lib.id;
        targetSubFolder = collection.slug;
        break;
      }
    }

    // 2. Se não encontrou pasta de primeiro nível, verifica através dos modelos vinculados
    if (!targetLibraryId && collection.models.length > 0) {
      const firstModel = collection.models[0];
      targetLibraryId = firstModel.libraryId;

      // Se o folderPath contiver subpasta (ex: Colecao/Modelo), tenta isolar a subpasta pai
      const parts = firstModel.folderPath.split("/").filter(Boolean);
      if (parts.length > 1) {
        targetSubFolder = parts[0];
      }
    }

    // 3. Fallback: primeira biblioteca ativa
    if (!targetLibraryId) {
      targetLibraryId = libraries[0].id;
    }

    // Executa o scan incremental cirúrgico
    const stats = await scanLibrary(targetLibraryId, {
      subFolder: targetSubFolder,
    });

    return NextResponse.json({
      success: true,
      subFolder: targetSubFolder || "todas",
      stats,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
