import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { requireOperator, handleAuthError } from "@/lib/auth/session";

const ALLOWED_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireOperator(request);

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

    const contentType = request.headers.get("content-type") || "";
    let coverUrl: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo de imagem enviado" }, { status: 400 });
      }

      const ext = path.extname(file.name).toLowerCase();
      if (!ALLOWED_IMAGE_EXTS.has(ext)) {
        return NextResponse.json(
          { error: "Formato de imagem inválido. Use PNG, JPG ou WEBP." },
          { status: 400 }
        );
      }

      // Salva no mesmo diretório do arquivo 3D com o mesmo nome base
      const targetFileName = `${baseName}${ext}`;
      const targetPath = path.join(targetDir, targetFileName);

      const bytes = await file.arrayBuffer();
      await fs.promises.writeFile(targetPath, Buffer.from(bytes));

      const relPath = path.relative(libRoot, targetPath);
      coverUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(relPath)}`;

      // Registra ou atualiza como asset do modelo
      const existingAsset = await prisma.modelAsset.findFirst({
        where: { modelId: id, assetType: "IMAGE", fileName: targetFileName },
      });

      if (existingAsset) {
        await prisma.modelAsset.update({
          where: { id: existingAsset.id },
          data: {
            relativePath: relPath,
            fileSize: BigInt(bytes.byteLength),
          },
        });
      } else {
        await prisma.modelAsset.create({
          data: {
            modelId: id,
            fileName: targetFileName,
            relativePath: relPath,
            assetType: "IMAGE",
            fileSize: BigInt(bytes.byteLength),
          },
        });
      }
    } else {
      const body = await request.json();

      if (body.coverUrl && typeof body.coverUrl === "string") {
        coverUrl = body.coverUrl;
      } else if (body.dataUrl && typeof body.dataUrl === "string" && body.dataUrl.startsWith("data:image/")) {
        const base64Data = body.dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        // Snapshot 3D salvo no mesmo diretório com o mesmo nome base (.png)
        const targetFileName = `${baseName}.png`;
        const targetPath = path.join(targetDir, targetFileName);

        await fs.promises.writeFile(targetPath, buffer);
        const relPath = path.relative(libRoot, targetPath);
        coverUrl = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(relPath)}`;

        const existingAsset = await prisma.modelAsset.findFirst({
          where: { modelId: id, assetType: "IMAGE", fileName: targetFileName },
        });

        if (existingAsset) {
          await prisma.modelAsset.update({
            where: { id: existingAsset.id },
            data: {
              relativePath: relPath,
              fileSize: BigInt(buffer.byteLength),
            },
          });
        } else {
          await prisma.modelAsset.create({
            data: {
              modelId: id,
              fileName: targetFileName,
              relativePath: relPath,
              assetType: "IMAGE",
              fileSize: BigInt(buffer.byteLength),
            },
          });
        }
      } else {
        return NextResponse.json({ error: "Dados de imagem inválidos ou não fornecidos" }, { status: 400 });
      }
    }

    const updated = await prisma.model.update({
      where: { id },
      data: { coverImage: coverUrl },
    });

    return NextResponse.json({ success: true, coverImage: updated.coverImage });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro ao atualizar capa:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
