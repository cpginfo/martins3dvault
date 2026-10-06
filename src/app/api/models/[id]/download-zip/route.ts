import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { acquireDownloadSlot } from "@/lib/security/concurrency-limiter";
import { logDownloadEvent } from "@/lib/security/download-logger";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  let slot: ReturnType<typeof acquireDownloadSlot> | null = null;
  let currentUserId = "anonymous";
  let currentUserEmail: string | undefined;

  try {
    const user = await requireAuth(undefined, request);
    currentUserId = user.id;
    currentUserEmail = user.email;

    const params = await props.params;
    const modelId = params.id;

    if (!modelId) {
      return new NextResponse("ID do modelo não fornecido", { status: 400 });
    }

    slot = acquireDownloadSlot(user.id, user.role);
    if (!slot.allowed) {
      logDownloadEvent({
        userId: user.id,
        userEmail: user.email,
        filePath: `zip:${modelId}`,
        result: "RATE_LIMITED_429",
        statusCode: slot.statusCode || 429,
        message: slot.message,
      });

      return NextResponse.json(
        { error: slot.message || "Limite de downloads concorrentes atingido" },
        { status: slot.statusCode || 429 }
      );
    }

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: {
        library: true,
        files: true,
        assets: true,
      },
    });

    if (!model) {
      return new NextResponse("Modelo não encontrado", { status: 404 });
    }

    const libRoot = path.resolve(model.library.path);
    const candidates = [
      libRoot,
      process.env.STORAGE_LIBRARIES_PATH ? path.resolve(process.env.STORAGE_LIBRARIES_PATH) : null,
      "/libraries",
      process.env.STORAGE_DATA_PATH ? path.resolve(process.env.STORAGE_DATA_PATH) : null,
      "/data",
    ].filter((p): p is string => Boolean(p));

    const zip = new AdmZip();
    let addedFilesCount = 0;

    const resolvePhysicalPath = (relPath: string): string | null => {
      const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
      for (const root of candidates) {
        const fullPath = path.join(root, safeRelPath);
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
          return fullPath;
        }
      }
      return null;
    };

    // 1. Adiciona arquivos 3D do modelo
    for (const file of model.files) {
      const physicalPath = resolvePhysicalPath(file.relativePath);
      if (physicalPath) {
        zip.addLocalFile(physicalPath, "", file.fileName);
        addedFilesCount++;
      }
    }

    // 2. Adiciona manuais e imagens acompanhantes (assets)
    for (const asset of model.assets) {
      const physicalPath = resolvePhysicalPath(asset.relativePath);
      if (physicalPath) {
        const subFolder = asset.assetType === "PDF_MANUAL" ? "manuais" : "anexos";
        zip.addLocalFile(physicalPath, subFolder, asset.fileName);
        addedFilesCount++;
      }
    }

    if (addedFilesCount === 0) {
      return new NextResponse("Nenhum arquivo físico disponível para download neste modelo", { status: 404 });
    }

    const zipBuffer = zip.toBuffer();

    const safeBaseName = (model.name || "modelo")
      .replace(/[^\w\s\-\.]/gi, "_")
      .trim() || "modelo";
    const zipFileName = `${safeBaseName}.zip`;
    const encodedName = encodeURIComponent(zipFileName);

    logDownloadEvent({
      userId: user.id,
      userEmail: user.email,
      filePath: `zip:${model.name} (${addedFilesCount} arquivos)`,
      result: "SUCCESS",
      statusCode: 200,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Length", zipBuffer.length.toString());
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeBaseName}.zip"; filename*=UTF-8''${encodedName}`
    );
    headers.set("Cache-Control", "private, no-cache, no-store, must-revalidate");

    return new NextResponse(new Uint8Array(zipBuffer), {
      status: 200,
      headers,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    logDownloadEvent({
      userId: currentUserId,
      userEmail: currentUserEmail,
      result: "ERROR",
      statusCode: 500,
      message: err?.message,
    });

    console.error("Erro ao gerar pacote ZIP:", err);
    return new NextResponse("Erro interno ao gerar pacote ZIP", { status: 500 });
  } finally {
    if (slot) {
      slot.release();
    }
  }
}
