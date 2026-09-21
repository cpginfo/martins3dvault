import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";
import { parseStlFile } from "@/lib/scanner/extractors/stl-parser";
import { extractThreeMfMetadata } from "@/lib/scanner/extractors/threemf";

const SUPPORTED_3D_EXTENSIONS = new Set([".stl", ".3mf", ".obj", ".step", ".stp"]);
const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function slugify(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "modelo";
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const customName = (formData.get("name") as string)?.trim();
    const collectionIdInput = (formData.get("collectionId") as string)?.trim();
    const newCollectionName = (formData.get("newCollectionName") as string)?.trim();
    const libraryIdInput = (formData.get("libraryId") as string)?.trim();
    const description = (formData.get("description") as string)?.trim();
    const filamentType = (formData.get("filamentType") as string)?.trim();

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Identifica ou obtém a biblioteca de destino
    let library = libraryIdInput
      ? await prisma.library.findUnique({ where: { id: libraryIdInput } })
      : await prisma.library.findFirst({ orderBy: { createdAt: "asc" } });

    // Se não existir nenhuma biblioteca no banco, cria uma biblioteca padrão "Uploads"
    if (!library) {
      const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
      const uploadsRoot = path.resolve(storageDataPath, "uploads");
      await fs.promises.mkdir(uploadsRoot, { recursive: true });

      library = await prisma.library.create({
        data: {
          name: "Uploads Manuais",
          path: uploadsRoot,
        },
      });
    }

    // Trata Coleção (se informada ou criada na hora)
    let collectionId = collectionIdInput || null;
    if (newCollectionName) {
      const colSlug = slugify(newCollectionName);
      const col = await prisma.collection.upsert({
        where: { slug: colSlug },
        update: {},
        create: {
          name: newCollectionName,
          slug: colSlug,
          description: `Coleção criada via upload manual`,
        },
      });
      collectionId = col.id;
    }

    // Separa os arquivos 3D dos anexos
    const threeDFileList: File[] = [];
    const imageFileList: File[] = [];
    const pdfFileList: File[] = [];

    for (const file of files) {
      const ext = path.extname(file.name).toLowerCase();
      if (SUPPORTED_3D_EXTENSIONS.has(ext)) {
        threeDFileList.push(file);
      } else if (IMAGE_EXTENSIONS.has(ext)) {
        imageFileList.push(file);
      } else if (ext === ".pdf") {
        pdfFileList.push(file);
      }
    }

    if (threeDFileList.length === 0) {
      return NextResponse.json(
        { error: "É necessário enviar pelo menos um arquivo 3D válido (.stl, .3mf, .obj, .step)" },
        { status: 400 }
      );
    }

    // Define o nome do modelo
    const primaryFile = threeDFileList[0];
    const defaultName = path.parse(primaryFile.name).name.replace(/[_-]/g, " ");
    const modelName = customName || defaultName;
    const modelSlug = slugify(modelName);

    // Cria diretório para o modelo dentro da biblioteca
    const libRoot = path.resolve(library.path);
    const folderRelative = modelSlug;
    const targetDir = path.join(libRoot, folderRelative);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Grava os arquivos no disco
    const savedFiles: { file: File; fullPath: string; relPath: string }[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const filePath = path.join(targetDir, file.name);
      await fs.promises.writeFile(filePath, buffer);
      savedFiles.push({
        file,
        fullPath: filePath,
        relPath: path.join(folderRelative, file.name),
      });
    }

    // Determina capa inicial se uma imagem foi enviada
    let modelCover: string | null = null;
    if (imageFileList.length > 0) {
      const firstImg = imageFileList[0];
      const imgRelPath = path.join(folderRelative, firstImg.name);
      modelCover = `/api/assets/file?libraryId=${library.id}&relPath=${encodeURIComponent(imgRelPath)}`;
    }

    // Cria o modelo no Prisma
    const model = await prisma.model.create({
      data: {
        libraryId: library.id,
        collectionId,
        name: modelName,
        slug: modelSlug,
        folderPath: folderRelative,
        description: description || null,
        filamentType: filamentType || null,
        coverImage: modelCover,
      },
    });

    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";

    // Processa os arquivos 3D
    for (let i = 0; i < threeDFileList.length; i++) {
      const file = threeDFileList[i];
      const saved = savedFiles.find((s) => s.file.name === file.name)!;
      const ext = path.extname(file.name).toLowerCase();
      const format = ext.replace(".", "").toUpperCase();

      const stat = await fs.promises.stat(saved.fullPath);
      const fileHash = `${stat.mtimeMs}_${stat.size}`;

      let dimensionsX: number | null = null;
      let dimensionsY: number | null = null;
      let dimensionsZ: number | null = null;
      let triangleCount: number | null = null;

      if (ext === ".stl") {
        const stlMeta = await parseStlFile(saved.fullPath);
        if (stlMeta) {
          dimensionsX = stlMeta.dimensionsX;
          dimensionsY = stlMeta.dimensionsY;
          dimensionsZ = stlMeta.dimensionsZ;
          triangleCount = stlMeta.triangleCount;
        }
      }

      if (ext === ".3mf") {
        const threeMfMeta = await extractThreeMfMetadata(
          saved.fullPath,
          model.id,
          storageDataPath
        );

        if (threeMfMeta.thumbnailPath && !modelCover) {
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
          fileName: file.name,
          relativePath: saved.relPath,
          fileSize: BigInt(stat.size),
          fileHash,
          format,
          dimensionsX,
          dimensionsY,
          dimensionsZ,
          triangleCount,
          isPrimary: i === 0,
        },
      });
    }

    // Processa imagens complementares
    for (const img of imageFileList) {
      const saved = savedFiles.find((s) => s.file.name === img.name)!;
      const stat = await fs.promises.stat(saved.fullPath);
      await prisma.modelAsset.create({
        data: {
          modelId: model.id,
          fileName: img.name,
          relativePath: saved.relPath,
          assetType: "IMAGE",
          fileSize: BigInt(stat.size),
        },
      });
    }

    // Processa manuais PDF
    for (const pdf of pdfFileList) {
      const saved = savedFiles.find((s) => s.file.name === pdf.name)!;
      const stat = await fs.promises.stat(saved.fullPath);
      await prisma.modelAsset.create({
        data: {
          modelId: model.id,
          fileName: pdf.name,
          relativePath: saved.relPath,
          assetType: "PDF_MANUAL",
          fileSize: BigInt(stat.size),
        },
      });
    }

    const completeModel = await prisma.model.findUnique({
      where: { id: model.id },
      include: {
        library: true,
        collection: true,
        files: true,
        assets: true,
      },
    });

    const sanitized = {
      ...completeModel,
      files: completeModel?.files.map((f) => ({ ...f, fileSize: Number(f.fileSize) })),
      assets: completeModel?.assets.map((a) => ({ ...a, fileSize: Number(a.fileSize) })),
    };

    return NextResponse.json(sanitized, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    console.error("Erro no upload de arquivo:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
