import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";

/**
 * Sanitiza um nome de arquivo ou pasta removendo caracteres inválidos
 */
export function sanitizeFileName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/^\.+/, "")
    .replace(/\.+$/, "")
    .trim() || "arquivo";
}

/**
 * Normaliza base name para comparações sem acentos e minúsculo
 */
export function normalizeBaseName(filename: string): string {
  const base = path.parse(filename).name;
  return base
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Verifica se um caminho de arquivo/pasta já existe.
 * Se existir, gera um sufixo numérico (ex: "Nome (1).ext", "Nome (2).ext")
 * para evitar sobrescrita e manter ambos os arquivos.
 */
export async function getAvailablePath(
  dir: string,
  baseName: string,
  ext: string = ""
): Promise<{ filePath: string; finalBaseName: string; finalFileName: string }> {
  const cleanBase = sanitizeFileName(baseName);
  let finalBaseName = cleanBase;
  let finalFileName = `${finalBaseName}${ext}`;
  let targetPath = path.join(dir, finalFileName);

  let counter = 1;
  while (fs.existsSync(targetPath)) {
    finalBaseName = `${cleanBase} (${counter})`;
    finalFileName = `${finalBaseName}${ext}`;
    targetPath = path.join(dir, finalFileName);
    counter++;
  }

  return { filePath: targetPath, finalBaseName, finalFileName };
}

/**
 * Move com segurança um arquivo ou pasta, com fallback para cópia + remoção caso esteja entre sistemas de arquivos diferentes.
 */
export async function safeMove(src: string, dest: string): Promise<void> {
  if (path.resolve(src) === path.resolve(dest)) return;
  if (!fs.existsSync(src)) return;

  await fs.promises.mkdir(path.dirname(dest), { recursive: true });

  try {
    await fs.promises.rename(src, dest);
  } catch (err: any) {
    if (err.code === "EXDEV") {
      const stat = await fs.promises.stat(src);
      if (stat.isDirectory()) {
        await fs.promises.cp(src, dest, { recursive: true });
        await fs.promises.rm(src, { recursive: true, force: true });
      } else {
        await fs.promises.copyFile(src, dest);
        await fs.promises.unlink(src);
      }
    } else {
      throw err;
    }
  }
}

/**
 * Cria fisicamente a pasta de uma coleção no disco do repositório/biblioteca.
 */
export async function ensureCollectionFolder(
  collectionName: string,
  libraryId?: string
): Promise<string[]> {
  const safeName = sanitizeFileName(collectionName);
  const createdPaths: string[] = [];

  if (libraryId) {
    const library = await prisma.library.findUnique({ where: { id: libraryId } });
    if (library) {
      const colDir = path.join(path.resolve(library.path), safeName);
      await fs.promises.mkdir(colDir, { recursive: true });
      createdPaths.push(colDir);
    }
  } else {
    const libraries = await prisma.library.findMany({ where: { enabled: true } });
    for (const lib of libraries) {
      const colDir = path.join(path.resolve(lib.path), safeName);
      await fs.promises.mkdir(colDir, { recursive: true });
      createdPaths.push(colDir);
    }
  }

  return createdPaths;
}

/**
 * Garante a criação da coleção "download" e de sua pasta física no repositório.
 */
export async function ensureDownloadCollection(libraryId?: string) {
  const colSlug = "download";
  const colName = "download";

  let collection = await prisma.collection.findUnique({
    where: { slug: colSlug },
  });

  if (!collection) {
    collection = await prisma.collection.create({
      data: {
        name: colName,
        slug: colSlug,
        description: "Coleção de arquivos baixados via link da internet",
      },
    });
  }

  await ensureCollectionFolder(collection.name, libraryId);

  return collection;
}

/**
 * Move fisicamente todos os arquivos do modelo (arquivo 3D, imagem de capa, manuais PDF)
 * para a pasta da coleção de destino e atualiza o banco de dados.
 */
export async function moveModelToCollection(
  modelId: string,
  targetCollectionId: string | null
) {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    include: {
      library: true,
      files: true,
      assets: true,
      collection: true,
    },
  });

  if (!model) {
    throw new Error(`Modelo não encontrado: ${modelId}`);
  }

  let targetCol = null;
  if (targetCollectionId) {
    targetCol = await prisma.collection.findUnique({
      where: { id: targetCollectionId },
    });
    if (!targetCol) {
      throw new Error(`Coleção de destino não encontrada: ${targetCollectionId}`);
    }
  }

  const libRoot = path.resolve(model.library.path);
  const currentDiskPath = path.join(libRoot, model.folderPath);

  // Pasta de destino: se houver coleção, usa a pasta da coleção; se null, usa a raiz da biblioteca
  const targetDir = targetCol
    ? path.join(libRoot, sanitizeFileName(targetCol.name))
    : libRoot;

  await fs.promises.mkdir(targetDir, { recursive: true });

  const isDirectoryProject = fs.existsSync(currentDiskPath) && fs.statSync(currentDiskPath).isDirectory();

  if (isDirectoryProject) {
    // Caso 1: Projeto em pasta dedicada (multi-peças)
    const folderBaseName = path.basename(currentDiskPath);
    const { filePath: finalDestPath, finalBaseName } = await getAvailablePath(targetDir, folderBaseName);

    await safeMove(currentDiskPath, finalDestPath);

    const newRelFolderPath = path.relative(libRoot, finalDestPath);

    // Atualiza ModelFiles
    for (const file of model.files) {
      const newFileRel = path.join(newRelFolderPath, file.fileName);
      await prisma.modelFile.update({
        where: { id: file.id },
        data: { relativePath: newFileRel },
      });
    }

    // Atualiza ModelAssets
    for (const asset of model.assets) {
      const newAssetRel = path.join(newRelFolderPath, asset.fileName);
      await prisma.modelAsset.update({
        where: { id: asset.id },
        data: { relativePath: newAssetRel },
      });
    }

    // Atualiza CoverImage se apontava para o asset relativo
    let updatedCover = model.coverImage;
    if (updatedCover && updatedCover.includes("/api/assets/file")) {
      try {
        const url = new URL(updatedCover, "http://localhost");
        const oldRel = url.searchParams.get("relPath");
        if (oldRel) {
          const fileName = path.basename(oldRel);
          const newRel = path.join(newRelFolderPath, fileName);
          updatedCover = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(newRel)}`;
        }
      } catch {}
    }

    const updatedModel = await prisma.model.update({
      where: { id: model.id },
      data: {
        collectionId: targetCollectionId,
        folderPath: newRelFolderPath,
        coverImage: updatedCover,
        ...(finalBaseName !== folderBaseName ? { name: finalBaseName } : {}),
      },
      include: {
        library: true,
        collection: true,
        files: true,
        assets: true,
      },
    });

    return updatedModel;
  } else {
    // Caso 2: Modelo baseado em arquivos individuais (3D + imagens + PDF na pasta)
    const oldDir = path.dirname(currentDiskPath);
    const primaryFile = model.files[0];
    const raw3DFileName = primaryFile ? primaryFile.fileName : path.basename(currentDiskPath);
    const ext3D = path.extname(raw3DFileName);
    const baseName3D = path.parse(raw3DFileName).name;

    // Garante nome disponível no destino para o arquivo 3D sem sobrescrever
    const { finalBaseName, finalFileName: new3DFileName, filePath: new3DPath } =
      await getAvailablePath(targetDir, baseName3D, ext3D);

    const hasRenamedSuffix = finalBaseName !== baseName3D;

    // Move arquivo(s) 3D
    for (const file of model.files) {
      let srcPath = path.join(libRoot, file.relativePath);
      if (!fs.existsSync(srcPath)) {
        srcPath = path.join(oldDir, file.fileName);
      }

      const fileExt = path.extname(file.fileName);
      const targetFileName = hasRenamedSuffix
        ? `${finalBaseName}${fileExt}`
        : file.fileName;
      const targetFilePath = path.join(targetDir, targetFileName);

      await safeMove(srcPath, targetFilePath);

      const newRel = path.relative(libRoot, targetFilePath);
      await prisma.modelFile.update({
        where: { id: file.id },
        data: {
          fileName: targetFileName,
          relativePath: newRel,
        },
      });
    }

    // Move Assets vinculados (Imagens e PDFs)
    const movedAssetFileNames = new Set<string>();
    for (const asset of model.assets) {
      let srcPath = path.join(libRoot, asset.relativePath);
      if (!fs.existsSync(srcPath)) {
        srcPath = path.join(oldDir, asset.fileName);
      }

      const assetExt = path.extname(asset.fileName);
      const targetAssetName = hasRenamedSuffix
        ? `${finalBaseName}${assetExt}`
        : asset.fileName;
      const targetAssetPath = path.join(targetDir, targetAssetName);

      await safeMove(srcPath, targetAssetPath);
      movedAssetFileNames.add(asset.fileName);

      const newRel = path.relative(libRoot, targetAssetPath);
      await prisma.modelAsset.update({
        where: { id: asset.id },
        data: {
          fileName: targetAssetName,
          relativePath: newRel,
        },
      });
    }

    // Procura também arquivos companheiros no disco da pasta antiga com mesmo nome base
    // caso existam e não estejam diretamente vinculados no Prisma
    if (fs.existsSync(oldDir) && oldDir !== targetDir) {
      try {
        const oldFiles = await fs.promises.readdir(oldDir);
        const oldBaseNorm = normalizeBaseName(baseName3D);
        for (const candidate of oldFiles) {
          if (movedAssetFileNames.has(candidate)) continue;
          const candidateExt = path.extname(candidate).toLowerCase();
          const isCompanion =
            [".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(candidateExt) &&
            normalizeBaseName(candidate) === oldBaseNorm;

          if (isCompanion) {
            const srcPath = path.join(oldDir, candidate);
            const targetName = hasRenamedSuffix
              ? `${finalBaseName}${candidateExt}`
              : candidate;
            const destPath = path.join(targetDir, targetName);
            await safeMove(srcPath, destPath);
          }
        }
      } catch (e) {
        console.warn("Aviso ao escanear companheiros não indexados:", e);
      }
    }

    const newRelFolderPath = path.relative(libRoot, new3DPath);

    // Atualiza CoverImage
    let updatedCover = model.coverImage;
    if (updatedCover && updatedCover.includes("/api/assets/file")) {
      try {
        const url = new URL(updatedCover, "http://localhost");
        const oldRel = url.searchParams.get("relPath");
        if (oldRel) {
          const oldExt = path.extname(oldRel);
          const newCoverFileName = hasRenamedSuffix
            ? `${finalBaseName}${oldExt}`
            : path.basename(oldRel);
          const newRel = path.relative(libRoot, path.join(targetDir, newCoverFileName));
          updatedCover = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(newRel)}`;
        }
      } catch {}
    }

    const updatedModel = await prisma.model.update({
      where: { id: model.id },
      data: {
        collectionId: targetCollectionId,
        folderPath: newRelFolderPath,
        coverImage: updatedCover,
        ...(hasRenamedSuffix ? { name: finalBaseName } : {}),
      },
      include: {
        library: true,
        collection: true,
        files: true,
        assets: true,
      },
    });

    return updatedModel;
  }
}

/**
 * Renomeia fisicamente o modelo e seus arquivos no disco (3D, imagens de capa e manuais PDF).
 */
export async function renameModelFiles(modelId: string, newName: string) {
  const cleanName = sanitizeFileName(newName);
  if (!cleanName) {
    throw new Error("Novo nome inválido");
  }

  const model = await prisma.model.findUnique({
    where: { id: modelId },
    include: {
      library: true,
      files: true,
      assets: true,
      collection: true,
    },
  });

  if (!model) {
    throw new Error(`Modelo não encontrado: ${modelId}`);
  }

  const libRoot = path.resolve(model.library.path);
  const currentDiskPath = path.join(libRoot, model.folderPath);
  const isDirectoryProject = fs.existsSync(currentDiskPath) && fs.statSync(currentDiskPath).isDirectory();

  if (isDirectoryProject) {
    // Caso 1: Pasta de projeto
    const parentDir = path.dirname(currentDiskPath);
    const { filePath: newFolderPath, finalBaseName } = await getAvailablePath(parentDir, cleanName);

    await safeMove(currentDiskPath, newFolderPath);

    const newRelFolderPath = path.relative(libRoot, newFolderPath);

    for (const file of model.files) {
      await prisma.modelFile.update({
        where: { id: file.id },
        data: {
          relativePath: path.join(newRelFolderPath, file.fileName),
        },
      });
    }

    for (const asset of model.assets) {
      await prisma.modelAsset.update({
        where: { id: asset.id },
        data: {
          relativePath: path.join(newRelFolderPath, asset.fileName),
        },
      });
    }

    let updatedCover = model.coverImage;
    if (updatedCover && updatedCover.includes("/api/assets/file")) {
      try {
        const url = new URL(updatedCover, "http://localhost");
        const oldRel = url.searchParams.get("relPath");
        if (oldRel) {
          const fileName = path.basename(oldRel);
          const newRel = path.join(newRelFolderPath, fileName);
          updatedCover = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(newRel)}`;
        }
      } catch {}
    }

    const updated = await prisma.model.update({
      where: { id: model.id },
      data: {
        name: finalBaseName,
        folderPath: newRelFolderPath,
        coverImage: updatedCover,
      },
      include: {
        library: true,
        collection: true,
        files: true,
        assets: true,
      },
    });

    return updated;
  } else {
    // Caso 2: Arquivos individuais
    const parentDir = path.dirname(currentDiskPath);
    const primaryFile = model.files[0];
    const old3DFileName = primaryFile ? primaryFile.fileName : path.basename(currentDiskPath);
    const ext3D = path.extname(old3DFileName);

    const { finalBaseName, finalFileName: new3DFileName, filePath: new3DPath } =
      await getAvailablePath(parentDir, cleanName, ext3D);

    // Renomeia o arquivo 3D principal no disco
    let src3DPath = path.join(libRoot, primaryFile?.relativePath || model.folderPath);
    if (!fs.existsSync(src3DPath)) {
      src3DPath = path.join(parentDir, old3DFileName);
    }
    await safeMove(src3DPath, new3DPath);

    if (primaryFile) {
      await prisma.modelFile.update({
        where: { id: primaryFile.id },
        data: {
          fileName: new3DFileName,
          relativePath: path.relative(libRoot, new3DPath),
        },
      });
    }

    // Renomeia imagens e PDFs companheiros no disco
    for (const asset of model.assets) {
      const assetExt = path.extname(asset.fileName);
      const newAssetFileName = `${finalBaseName}${assetExt}`;
      const newAssetPath = path.join(parentDir, newAssetFileName);

      let srcAssetPath = path.join(libRoot, asset.relativePath);
      if (!fs.existsSync(srcAssetPath)) {
        srcAssetPath = path.join(parentDir, asset.fileName);
      }

      await safeMove(srcAssetPath, newAssetPath);

      await prisma.modelAsset.update({
        where: { id: asset.id },
        data: {
          fileName: newAssetFileName,
          relativePath: path.relative(libRoot, newAssetPath),
        },
      });
    }

    const newRelFolderPath = path.relative(libRoot, new3DPath);

    let updatedCover = model.coverImage;
    if (updatedCover && updatedCover.includes("/api/assets/file")) {
      try {
        const url = new URL(updatedCover, "http://localhost");
        const oldRel = url.searchParams.get("relPath");
        if (oldRel) {
          const oldExt = path.extname(oldRel);
          const newCoverFileName = `${finalBaseName}${oldExt}`;
          const newRel = path.relative(libRoot, path.join(parentDir, newCoverFileName));
          updatedCover = `/api/assets/file?libraryId=${model.libraryId}&relPath=${encodeURIComponent(newRel)}`;
        }
      } catch {}
    }

    const updated = await prisma.model.update({
      where: { id: model.id },
      data: {
        name: finalBaseName,
        folderPath: newRelFolderPath,
        coverImage: updatedCover,
      },
      include: {
        library: true,
        collection: true,
        files: true,
        assets: true,
      },
    });

    return updated;
  }
}
