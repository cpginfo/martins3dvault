import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function POST(
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
        files: {
          orderBy: [{ isPrimary: "desc" }, { fileName: "asc" }],
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase();
    if (ext !== ".pdf") {
      return NextResponse.json(
        { error: "Apenas arquivos no formato PDF são aceitos como manual." },
        { status: 400 }
      );
    }

    const primaryFile = model.files.find((f) => f.isPrimary) || model.files[0];
    const libRoot = path.resolve(model.library.path);
    const modelDiskPath = path.join(libRoot, model.folderPath);

    let targetDir: string;
    let baseName: string;

    if (primaryFile) {
      const fileAbsPath = path.join(libRoot, primaryFile.relativePath);
      targetDir = path.dirname(fileAbsPath);
      baseName = path.parse(primaryFile.fileName).name;
    } else if (fs.existsSync(modelDiskPath) && fs.statSync(modelDiskPath).isFile()) {
      targetDir = path.dirname(modelDiskPath);
      baseName = path.parse(modelDiskPath).name;
    } else {
      targetDir = modelDiskPath;
      baseName = path.parse(model.name).name;
    }

    await fs.promises.mkdir(targetDir, { recursive: true });

    // Salva no mesmo diretório do arquivo com o mesmo nome base, mantendo apenas a extensão .pdf
    const targetFileName = `${baseName}.pdf`;
    const filePath = path.join(targetDir, targetFileName);
    const bytes = await file.arrayBuffer();
    await fs.promises.writeFile(filePath, Buffer.from(bytes));

    const relPath = path.relative(libRoot, filePath);

    const existingAsset = await prisma.modelAsset.findFirst({
      where: { modelId: id, assetType: "PDF_MANUAL" },
    });

    let asset;
    if (existingAsset) {
      asset = await prisma.modelAsset.update({
        where: { id: existingAsset.id },
        data: {
          fileName: targetFileName,
          relativePath: relPath,
          fileSize: BigInt(bytes.byteLength),
          assetType: "PDF_MANUAL",
        },
      });
    } else {
      asset = await prisma.modelAsset.create({
        data: {
          modelId: id,
          fileName: targetFileName,
          relativePath: relPath,
          assetType: "PDF_MANUAL",
          fileSize: BigInt(bytes.byteLength),
        },
      });
    }

    return NextResponse.json({
      success: true,
      asset: {
        ...asset,
        fileSize: Number(asset.fileSize),
      },
    });
  } catch (err: any) {
    console.error("Erro ao enviar manual:", err);
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
    const assetId = searchParams.get("assetId");

    if (!assetId) {
      return NextResponse.json({ error: "assetId não informado" }, { status: 400 });
    }

    const asset = await prisma.modelAsset.findFirst({
      where: { id: assetId, modelId: id },
      include: { model: { include: { library: true } } },
    });

    if (!asset) {
      return NextResponse.json({ error: "Manual não encontrado" }, { status: 404 });
    }

    // Tenta remover o arquivo do disco
    try {
      const libRoot = path.resolve(asset.model.library.path);
      const fullPath = path.join(libRoot, asset.relativePath);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (fsErr) {
      console.warn("Aviso ao deletar arquivo de manual do disco:", fsErr);
    }

    await prisma.modelAsset.delete({
      where: { id: assetId },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro ao excluir manual:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
