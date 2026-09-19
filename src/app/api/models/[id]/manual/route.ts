import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (user && user.role === "VIEWER") {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
    }

    const { id } = await props.params;

    const model = await prisma.model.findUnique({
      where: { id },
      include: { library: true },
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

    const libRoot = path.resolve(model.library.path);
    const modelDiskPath = path.join(libRoot, model.folderPath);

    let targetDir = modelDiskPath;
    if (fs.existsSync(modelDiskPath) && fs.statSync(modelDiskPath).isFile()) {
      targetDir = path.dirname(modelDiskPath);
    }
    await fs.promises.mkdir(targetDir, { recursive: true });

    const safeName = file.name.replace(/[\/\\]/g, "_");
    const filePath = path.join(targetDir, safeName);
    const bytes = await file.arrayBuffer();
    await fs.promises.writeFile(filePath, Buffer.from(bytes));

    const relPath = path.relative(libRoot, filePath);

    const existingAsset = await prisma.modelAsset.findFirst({
      where: { modelId: id, fileName: safeName },
    });

    let asset;
    if (existingAsset) {
      asset = await prisma.modelAsset.update({
        where: { id: existingAsset.id },
        data: {
          relativePath: relPath,
          fileSize: BigInt(bytes.byteLength),
          assetType: "PDF_MANUAL",
        },
      });
    } else {
      asset = await prisma.modelAsset.create({
        data: {
          modelId: id,
          fileName: safeName,
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
    const user = await getCurrentUser();
    if (user && user.role === "VIEWER") {
      return NextResponse.json({ error: "Permissão insuficiente" }, { status: 403 });
    }

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
    console.error("Erro ao excluir manual:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
