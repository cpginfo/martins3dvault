import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ path: string[] }> }
) {
  try {
    await requireAdmin(request);
    const params = await props.params;
    const pathSegments = params.path;

    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse("Arquivo não especificado", { status: 400 });
    }

    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
    const thumbsDir = path.resolve(path.join(storageDataPath, "thumbnails"));

    const relPath = path.join(...pathSegments);
    const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(thumbsDir, safeRelPath);

    if (!fullPath.startsWith(thumbsDir)) {
      return new NextResponse("Acesso não permitido", { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Thumbnail não encontrada", { status: 404 });
    }

    const stat = await fs.promises.stat(fullPath);
    const ext = path.extname(fullPath).toLowerCase();
    const contentType =
      ext === ".png"
        ? "image/png"
        : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
        ? "image/webp"
        : "application/octet-stream";

    const fileStream = fs.createReadStream(fullPath);
    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Length", stat.size.toString());
    headers.set("Cache-Control", "public, max-age=31536000, immutable");

    return new NextResponse(readable, { status: 200, headers });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return new NextResponse("Erro ao carregar thumbnail", { status: 500 });
  }
}
