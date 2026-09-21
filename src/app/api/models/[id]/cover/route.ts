import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

const ALLOWED_IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await props.params;

    const model = await prisma.model.findUnique({
      where: { id },
      include: { library: true },
    });
    if (!model) {
      return NextResponse.json({ error: "Modelo não encontrado" }, { status: 404 });
    }

    const contentType = request.headers.get("content-type") || "";
    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
    const thumbDir = path.resolve(path.join(storageDataPath, "thumbnails"));
    await fs.promises.mkdir(thumbDir, { recursive: true });

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

      const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `${id}_cover_${Date.now()}_${cleanFileName}`;
      const targetPath = path.join(thumbDir, fileName);

      const bytes = await file.arrayBuffer();
      await fs.promises.writeFile(targetPath, Buffer.from(bytes));

      coverUrl = `/api/assets/thumbnails/${fileName}`;

      // Registra também como asset do modelo
      await prisma.modelAsset.create({
        data: {
          modelId: id,
          fileName: file.name,
          relativePath: fileName,
          assetType: "IMAGE",
          fileSize: BigInt(bytes.byteLength),
        },
      });
    } else {
      const body = await request.json();

      if (body.coverUrl && typeof body.coverUrl === "string") {
        coverUrl = body.coverUrl;
      } else if (body.dataUrl && typeof body.dataUrl === "string" && body.dataUrl.startsWith("data:image/")) {
        const base64Data = body.dataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");

        const fileName = `${id}_snapshot_${Date.now()}.png`;
        const targetPath = path.join(thumbDir, fileName);

        await fs.promises.writeFile(targetPath, buffer);
        coverUrl = `/api/assets/thumbnails/${fileName}`;
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
