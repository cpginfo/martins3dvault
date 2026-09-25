import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import prisma from "@/lib/prisma";
import { convert3mfToBinaryStl } from "@/lib/scanner/extractors/threemf-converter";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { acquireDownloadSlot, getOrConvertMesh } from "@/lib/security/concurrency-limiter";
import { createBandwidthThrottler } from "@/lib/security/stream-throttler";
import { logDownloadEvent } from "@/lib/security/download-logger";

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

    const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
    const libRoot = path.resolve(library.path);
    let fullPath = path.join(libRoot, safeRelPath);

    const isWithinLib = fullPath.startsWith(libRoot);
    let fileFound = isWithinLib && fs.existsSync(fullPath);

    // Fallback inteligente se o caminho cadastrado estiver divergente
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

    // Se já for STL ou OBJ, serve diretamente em alta velocidade
    if (ext === ".stl" || ext === ".obj") {
      const fileStream = fs.createReadStream(fullPath, { highWaterMark: 1024 * 1024 });
      const throttler = createBandwidthThrottler();
      const outputStream = throttler ? fileStream.pipe(throttler) : fileStream;

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
      headers.set("Content-Type", ext === ".stl" ? "model/stl" : "model/obj");
      headers.set("Content-Length", stat.size.toString());
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=86400");
      headers.set("X-Mesh-Format", ext.replace(".", "").toUpperCase());

      return new NextResponse(readable, { status: 200, headers });
    }

    // Se for 3MF, utiliza versão STL binária em cache para carregamento ultrarrápido no Three.js
    if (ext === ".3mf") {
      const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
      const cacheDir = path.resolve(path.join(storageDataPath, "cache"));
      await fs.promises.mkdir(cacheDir, { recursive: true });

      const fileHash = `mesh_${stat.mtimeMs}_${stat.size}`;
      const cachedStlPath = path.join(cacheDir, `${fileHash}.stl`);

      // 2. Lock por fileHash: se já houver conversão do mesmo arquivo em andamento,
      // requisições concorrentes aguardam a MESMA Promise em vez de duplicar carga na CPU
      let finalFilePath = cachedStlPath;

      if (!fs.existsSync(cachedStlPath)) {
        try {
          const { path: convertedPath } = await getOrConvertMesh(fileHash, async () => {
            // Se entre o início e a aquisição o arquivo foi gerado
            if (fs.existsSync(cachedStlPath)) {
              return cachedStlPath;
            }
            const stlBuffer = await convert3mfToBinaryStl(fullPath);
            await fs.promises.writeFile(cachedStlPath, stlBuffer);
            return cachedStlPath;
          });
          finalFilePath = convertedPath;
        } catch (convErr) {
          console.warn("Falha na conversão para cache STL, enviando arquivo original 3MF:", convErr);
          // Fallback para o arquivo original se a conversão falhar
          const fileStream = fs.createReadStream(fullPath, { highWaterMark: 1024 * 1024 });
          const throttler = createBandwidthThrottler();
          const outputStream = throttler ? fileStream.pipe(throttler) : fileStream;

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
          headers.set("Content-Type", "application/vnd.ms-package.3dmanufacturing-3dmodel+xml");
          headers.set("Content-Length", stat.size.toString());
          headers.set("X-Mesh-Format", "3MF");
          return new NextResponse(readable, { status: 200, headers });
        }
      }

      const cachedStat = await fs.promises.stat(finalFilePath);
      const fileStream = fs.createReadStream(finalFilePath, { highWaterMark: 1024 * 1024 });
      const throttler = createBandwidthThrottler();
      const outputStream = throttler ? fileStream.pipe(throttler) : fileStream;

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
      headers.set("Content-Type", "model/stl");
      headers.set("Content-Length", cachedStat.size.toString());
      headers.set("Accept-Ranges", "bytes");
      headers.set("Cache-Control", "public, max-age=86400");
      headers.set("X-Mesh-Format", "STL_CONVERTED");

      return new NextResponse(readable, { status: 200, headers });
    }

    return new NextResponse("Formato não suportado para streaming de malha 3D", { status: 400 });
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

    console.error("Erro no endpoint /api/assets/mesh:", err);
    return new NextResponse("Erro interno ao processar malha", { status: 500 });
  } finally {
    if (slot && !streamStarted) {
      slot.release();
    }
  }
}
