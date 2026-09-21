import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

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
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get("libraryId");
    const relPath = searchParams.get("relPath");
    const download = searchParams.get("download") === "true";

    if (!libraryId || !relPath) {
      return new NextResponse("Parâmetros inválidos", { status: 400 });
    }

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
    });

    if (!library) {
      return new NextResponse("Biblioteca não encontrada", { status: 404 });
    }

    // Proteção rigorosa contra Directory Traversal
    const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(path.resolve(library.path), safeRelPath);

    // Garante que o arquivo está contido dentro da raiz da biblioteca
    if (!fullPath.startsWith(path.resolve(library.path))) {
      return new NextResponse("Acesso não permitido", { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Arquivo não encontrado", { status: 404 });
    }

    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) {
      return new NextResponse("Recurso inválido", { status: 400 });
    }

    const ext = path.extname(fullPath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const fileName = path.basename(fullPath);

    const fileStream = fs.createReadStream(fullPath, { highWaterMark: 1024 * 1024 });
    const readable = Readable.toWeb(fileStream) as ReadableStream;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", stat.size.toString());
    headers.set("Accept-Ranges", "bytes");
    headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");

    if (download) {
      headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    } else {
      headers.set("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
    }

    return new NextResponse(readable, {
      status: 200,
      headers,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro ao servir asset:", err);
    return new NextResponse("Erro interno ao servir arquivo", { status: 500 });
  }
}
