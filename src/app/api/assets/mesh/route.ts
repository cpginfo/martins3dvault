import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import prisma from "@/lib/prisma";
import { convert3mfToBinaryStl } from "@/lib/scanner/extractors/threemf-converter";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const libraryId = searchParams.get("libraryId");
    const relPath = searchParams.get("relPath");

    if (!libraryId || !relPath) {
      return new NextResponse("Parâmetros inválidos", { status: 400 });
    }

    const library = await prisma.library.findUnique({
      where: { id: libraryId },
    });

    if (!library) {
      return new NextResponse("Biblioteca não encontrada", { status: 404 });
    }

    const safeRelPath = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
    const fullPath = path.join(path.resolve(library.path), safeRelPath);

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

    // Se já for STL ou OBJ, serve diretamente em alta velocidade
    if (ext === ".stl" || ext === ".obj") {
      const fileStream = fs.createReadStream(fullPath, { highWaterMark: 1024 * 1024 });
      const readable = Readable.toWeb(fileStream) as ReadableStream;

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

      // Se ainda não estiver em cache, converte e salva
      if (!fs.existsSync(cachedStlPath)) {
        try {
          const stlBuffer = await convert3mfToBinaryStl(fullPath);
          await fs.promises.writeFile(cachedStlPath, stlBuffer);
        } catch (convErr) {
          console.warn("Falha na conversão para cache STL, enviando arquivo original 3MF:", convErr);
          // Fallback para o arquivo original se a conversão falhar
          const fileStream = fs.createReadStream(fullPath, { highWaterMark: 1024 * 1024 });
          const readable = Readable.toWeb(fileStream) as ReadableStream;
          const headers = new Headers();
          headers.set("Content-Type", "application/vnd.ms-package.3dmanufacturing-3dmodel+xml");
          headers.set("Content-Length", stat.size.toString());
          headers.set("X-Mesh-Format", "3MF");
          return new NextResponse(readable, { status: 200, headers });
        }
      }

      const cachedStat = await fs.promises.stat(cachedStlPath);
      const fileStream = fs.createReadStream(cachedStlPath, { highWaterMark: 1024 * 1024 });
      const readable = Readable.toWeb(fileStream) as ReadableStream;

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
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro no endpoint /api/assets/mesh:", err);
    return new NextResponse("Erro interno ao processar malha", { status: 500 });
  }
}
