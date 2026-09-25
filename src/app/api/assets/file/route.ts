import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { acquireDownloadSlot } from "@/lib/security/concurrency-limiter";
import { createBandwidthThrottler } from "@/lib/security/stream-throttler";
import { logDownloadEvent } from "@/lib/security/download-logger";

const MIME_TYPES: Record<string, string> = {
  ".stl": "model/stl",
  ".3mf": "application/vnd.ms-package.3dmanufacturing-3dmodel+xml",
  ".obj": "model/obj",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gcode": "text/plain",
};

export async function GET(request: Request) {
  let slot: ReturnType<typeof acquireDownloadSlot> | null = null;
  let streamStarted = false;
  let currentUserId = "anonymous";
  let currentUserEmail: string | undefined;

  try {
    const user = await requireAuth(undefined, request);
    currentUserId = user.id;
    currentUserEmail = user.email;

    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get("libraryId");
    const relPath = searchParams.get("relPath");
    const download = searchParams.get("download") === "true";

    if (!libraryId || !relPath) {
      return new NextResponse("Parâmetros inválidos", { status: 400 });
    }

    // 1. Controle de concorrência por usuário (máx. 3) e global (máx. 15)
    slot = acquireDownloadSlot(user.id, user.role);
    if (!slot.allowed) {
      logDownloadEvent({
        userId: user.id,
        userEmail: user.email,
        filePath: relPath,
        result: "RATE_LIMITED_429",
        statusCode: slot.statusCode || 429,
        message: slot.message,
      });

      return NextResponse.json(
        { error: slot.message },
        { status: slot.statusCode || 429, headers: { "Retry-After": "5" } }
      );
    }

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
    });

    if (!library) {
      return new NextResponse("Biblioteca não encontrada", { status: 404 });
    }

    // Proteção rigorosa contra Directory Traversal
    const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
    const libRoot = path.resolve(library.path);
    let fullPath = path.join(libRoot, safeRelPath);

    // Garante que o arquivo está contido dentro da raiz da biblioteca
    const isWithinLib = fullPath.startsWith(libRoot);
    let fileFound = isWithinLib && fs.existsSync(fullPath);

    // Fallback inteligente: se não encontrou no caminho cadastrado da biblioteca,
    // verifica no diretório padrão de bibliotecas ou dados montados
    if (!fileFound) {
      const candidates = [
        process.env.STORAGE_LIBRARIES_PATH ? path.resolve(process.env.STORAGE_LIBRARIES_PATH) : null,
        "/libraries",
        process.env.STORAGE_DATA_PATH ? path.resolve(process.env.STORAGE_DATA_PATH) : null,
        "/data",
      ].filter((p): p is string => Boolean(p));

      for (const candidateRoot of candidates) {
        const candidatePath = path.join(candidateRoot, safeRelPath);
        if (candidatePath.startsWith(candidateRoot) && fs.existsSync(candidatePath)) {
          fullPath = candidatePath;
          fileFound = true;
          break;
        }
      }
    }

    if (!fileFound) {
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }

    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) {
      return new NextResponse("Recurso inválido", { status: 400 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileName = path.basename(fullPath);

    // Cria stream com throttling opcional de banda
    const fileStream = fs.createReadStream(fullPath, { highWaterMark: 1024 * 1024 });
    const throttler = createBandwidthThrottler();
    const outputStream = throttler ? fileStream.pipe(throttler) : fileStream;

    // Vincula a liberação do slot ao encerramento ou aborto da conexão
    slot.bindToStream(outputStream, request.signal);
    streamStarted = true;

    logDownloadEvent({
      userId: user.id,
      userEmail: user.email,
      filePath: safeRelPath,
      result: "SUCCESS",
      statusCode: 200,
    });

    const readable = Readable.toWeb(outputStream as Readable) as ReadableStream;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", stat.size.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    const fallbackName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "");
    const encodedName = encodeURIComponent(fileName);

    if (download) {
      headers.set(
        "Content-Disposition",
        `attachment; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`
      );
    } else {
      headers.set(
        "Content-Disposition",
        `inline; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`
      );
    }

    return new NextResponse(readable, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    if (slot && !streamStarted) {
      slot.release();
    }

    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    logDownloadEvent({
      userId: currentUserId,
      userEmail: currentUserEmail,
      result: "ERROR",
      statusCode: 500,
      message: err?.message,
    });

    console.error("Erro ao servir asset:", err);
    return new NextResponse("Erro interno ao servir arquivo", { status: 500 });
  } finally {
    // Se ocorreu retorno antecipado sem início de streaming, libera o slot
    if (slot && !streamStarted) {
      slot.release();
    }
  }
}
