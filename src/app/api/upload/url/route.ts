import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";
import { parseStlFile } from "@/lib/scanner/extractors/stl-parser";
import { extractThreeMfMetadata } from "@/lib/scanner/extractors/threemf";
import {
  ensureDownloadCollection,
  getAvailablePath,
  sanitizeFileName,
} from "@/lib/storage/file-ops";

const SUPPORTED_3D_EXTENSIONS = new Set([".stl", ".3mf", ".obj", ".step", ".stp"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "download";
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { url, name: customName, description, filamentType, libraryId: libraryIdInput } = body;

    if (!url || typeof url !== "string" || !url.trim().startsWith("http")) {
      return NextResponse.json(
        { error: "URL inválida. Forneça um link HTTP ou HTTPS válido." },
        { status: 400 }
      );
    }

    // Identifica biblioteca de destino
    let library = libraryIdInput
      ? await prisma.library.findUnique({ where: { id: libraryIdInput } })
      : await prisma.library.findFirst({ where: { enabled: true }, orderBy: { createdAt: "asc" } });

    if (!library) {
      const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
      const uploadsRoot = path.resolve(storageDataPath, "uploads");
      await fs.promises.mkdir(uploadsRoot, { recursive: true });

      library = await prisma.library.create({
        data: {
          name: "Biblioteca Principal",
          path: uploadsRoot,
        },
      });
    }

    // Garante a existência da coleção e da pasta "download"
    const downloadCollection = await ensureDownloadCollection(library.id);
    const libRoot = path.resolve(library.path);
    const downloadDir = path.join(libRoot, "download");
    await fs.promises.mkdir(downloadDir, { recursive: true });

    // Realiza o download via fetch com timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minutos timeout

    let res;
    try {
      res = await fetch(url.trim(), {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Martins3DVault/1.3.0",
        },
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      return NextResponse.json(
        { error: `Erro ao conectar com a URL fornecida: ${fetchErr.message}` },
        { status: 400 }
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Falha ao baixar o arquivo: o servidor retornou status ${res.status} (${res.statusText})` },
        { status: 400 }
      );
    }

    // Descobre o nome do arquivo a partir dos headers ou da URL
    let detectedFileName = "";
    const contentDisposition = res.headers.get("content-disposition");
    if (contentDisposition) {
      const matchStar = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      const matchRegular = contentDisposition.match(/filename=["']?([^"';]+)["']?/i);
      if (matchStar && matchStar[1]) {
        detectedFileName = decodeURIComponent(matchStar[1]);
      } else if (matchRegular && matchRegular[1]) {
        detectedFileName = matchRegular[1];
      }
    }

    if (!detectedFileName) {
      try {
        const parsedUrl = new URL(url);
        detectedFileName = path.basename(parsedUrl.pathname);
      } catch {}
    }

    if (!detectedFileName || !detectedFileName.includes(".")) {
      detectedFileName = customName ? `${customName}.stl` : "downloaded_model.stl";
    }

    detectedFileName = sanitizeFileName(detectedFileName);
    const ext = path.extname(detectedFileName).toLowerCase();
    const isZip = ext === ".zip";

    if (!isZip && !SUPPORTED_3D_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          error: `Formato de arquivo '${ext}' não suportado. Use links para arquivos .stl, .3mf, .obj, .step ou pacotes .zip.`,
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";

    if (isZip) {
      // Caso ZIP: descompacta em uma pasta dedicada dentro de download/
      const zipBaseName = customName || path.parse(detectedFileName).name.replace(/[_-]/g, " ");
      const { filePath: targetProjectDir, finalBaseName } = await getAvailablePath(downloadDir, zipBaseName);
      await fs.promises.mkdir(targetProjectDir, { recursive: true });

      const zip = new AdmZip(buffer);
      zip.extractAllTo(targetProjectDir, true);

      // Lê os arquivos extraídos
      const extractedEntries = await fs.promises.readdir(targetProjectDir, { withFileTypes: true });
      const threeDFiles: string[] = [];
      const imageFiles: string[] = [];
      const pdfFiles: string[] = [];

      for (const entry of extractedEntries) {
        if (!entry.isFile()) continue;
        const eExt = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_3D_EXTENSIONS.has(eExt)) threeDFiles.push(entry.name);
        else if (IMAGE_EXTENSIONS.has(eExt)) imageFiles.push(entry.name);
        else if (eExt === ".pdf") pdfFiles.push(entry.name);
      }

      if (threeDFiles.length === 0) {
        return NextResponse.json(
          { error: "Nenhum arquivo 3D válido (.stl, .3mf, .obj, .step) foi encontrado dentro do arquivo ZIP." },
          { status: 400 }
        );
      }

      const relFolderPath = path.relative(libRoot, targetProjectDir);
      let modelCover: string | null = null;
      if (imageFiles.length > 0) {
        const coverRel = path.join(relFolderPath, imageFiles[0]);
        modelCover = `/api/assets/file?libraryId=${library.id}&relPath=${encodeURIComponent(coverRel)}`;
      }

      const model = await prisma.model.create({
        data: {
          libraryId: library.id,
          collectionId: downloadCollection.id,
          name: finalBaseName,
          slug: slugify(finalBaseName),
          folderPath: relFolderPath,
          description: description || `Baixado via URL: ${url}`,
          filamentType: filamentType || null,
          coverImage: modelCover,
        },
      });

      // Cadastra arquivos 3D
      for (let i = 0; i < threeDFiles.length; i++) {
        const fName = threeDFiles[i];
        const fullFPath = path.join(targetProjectDir, fName);
        const fExt = path.extname(fName).toLowerCase();
        const stat = await fs.promises.stat(fullFPath);

        let dimensionsX: number | null = null;
        let dimensionsY: number | null = null;
        let dimensionsZ: number | null = null;
        let triangleCount: number | null = null;

        if (fExt === ".stl") {
          const stlMeta = await parseStlFile(fullFPath);
          if (stlMeta) {
            dimensionsX = stlMeta.dimensionsX;
            dimensionsY = stlMeta.dimensionsY;
            dimensionsZ = stlMeta.dimensionsZ;
            triangleCount = stlMeta.triangleCount;
          }
        } else if (fExt === ".3mf") {
          const threeMfMeta = await extractThreeMfMetadata(fullFPath, model.id, storageDataPath);
          if (threeMfMeta.thumbnailPath && !modelCover) {
            modelCover = threeMfMeta.thumbnailPath;
            await prisma.model.update({
              where: { id: model.id },
              data: { coverImage: modelCover },
            });
          }
        }

        await prisma.modelFile.create({
          data: {
            modelId: model.id,
            fileName: fName,
            relativePath: path.join(relFolderPath, fName),
            fileSize: BigInt(stat.size),
            format: fExt.replace(".", "").toUpperCase(),
            dimensionsX,
            dimensionsY,
            dimensionsZ,
            triangleCount,
            isPrimary: i === 0,
          },
        });
      }

      // Cadastra imagens
      for (const img of imageFiles) {
        const fullImgPath = path.join(targetProjectDir, img);
        const stat = await fs.promises.stat(fullImgPath);
        await prisma.modelAsset.create({
          data: {
            modelId: model.id,
            fileName: img,
            relativePath: path.join(relFolderPath, img),
            assetType: "IMAGE",
            fileSize: BigInt(stat.size),
          },
        });
      }

      // Cadastra manuais PDF
      for (const pdf of pdfFiles) {
        const fullPdfPath = path.join(targetProjectDir, pdf);
        const stat = await fs.promises.stat(fullPdfPath);
        await prisma.modelAsset.create({
          data: {
            modelId: model.id,
            fileName: pdf,
            relativePath: path.join(relFolderPath, pdf),
            assetType: "PDF_MANUAL",
            fileSize: BigInt(stat.size),
          },
        });
      }

      const finalCreated = await prisma.model.findUnique({
        where: { id: model.id },
        include: { library: true, collection: true, files: true, assets: true },
      });

      return NextResponse.json({
        ...finalCreated,
        files: finalCreated?.files.map((f) => ({ ...f, fileSize: Number(f.fileSize) })),
        assets: finalCreated?.assets.map((a) => ({ ...a, fileSize: Number(a.fileSize) })),
      });
    } else {
      // Caso arquivo 3D individual (.stl, .3mf, .obj, .step)
      const rawBaseName = customName || path.parse(detectedFileName).name.replace(/[_-]/g, " ");
      const { filePath: targetFilePath, finalBaseName, finalFileName } =
        await getAvailablePath(downloadDir, rawBaseName, ext);

      await fs.promises.writeFile(targetFilePath, buffer);
      const stat = await fs.promises.stat(targetFilePath);

      const relFolderPath = path.relative(libRoot, targetFilePath);

      const model = await prisma.model.create({
        data: {
          libraryId: library.id,
          collectionId: downloadCollection.id,
          name: finalBaseName,
          slug: slugify(finalBaseName),
          folderPath: relFolderPath,
          description: description || `Baixado via URL: ${url}`,
          filamentType: filamentType || null,
        },
      });

      let dimensionsX: number | null = null;
      let dimensionsY: number | null = null;
      let dimensionsZ: number | null = null;
      let triangleCount: number | null = null;
      let modelCover: string | null = null;

      if (ext === ".stl") {
        const stlMeta = await parseStlFile(targetFilePath);
        if (stlMeta) {
          dimensionsX = stlMeta.dimensionsX;
          dimensionsY = stlMeta.dimensionsY;
          dimensionsZ = stlMeta.dimensionsZ;
          triangleCount = stlMeta.triangleCount;
        }
      } else if (ext === ".3mf") {
        const threeMfMeta = await extractThreeMfMetadata(targetFilePath, model.id, storageDataPath);
        if (threeMfMeta.thumbnailPath) {
          modelCover = threeMfMeta.thumbnailPath;
          await prisma.model.update({
            where: { id: model.id },
            data: {
              coverImage: modelCover,
              filamentType: threeMfMeta.filamentType || undefined,
              layerHeight: threeMfMeta.layerHeight || undefined,
            },
          });
        }
      }

      await prisma.modelFile.create({
        data: {
          modelId: model.id,
          fileName: finalFileName,
          relativePath: relFolderPath,
          fileSize: BigInt(stat.size),
          format: ext.replace(".", "").toUpperCase(),
          dimensionsX,
          dimensionsY,
          dimensionsZ,
          triangleCount,
          isPrimary: true,
        },
      });

      const finalCreated = await prisma.model.findUnique({
        where: { id: model.id },
        include: { library: true, collection: true, files: true, assets: true },
      });

      return NextResponse.json({
        ...finalCreated,
        files: finalCreated?.files.map((f) => ({ ...f, fileSize: Number(f.fileSize) })),
        assets: finalCreated?.assets.map((a) => ({ ...a, fileSize: Number(a.fileSize) })),
      });
    }
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro no download via URL:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
