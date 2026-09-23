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
 * Gera um slug padronizado para coleções com base em seu caminho ou nome
 */
export function slugifyCollection(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "colecao"
  );
}

/**
 * Obtém o caminho relativo completo da pasta de uma coleção no disco,
 * subindo a árvore de pais caso o folderPath não esteja preenchido.
 */
export async function getCollectionFolderPath(collectionId: string): Promise<string> {
  const col = (await prisma.collection.findUnique({
    where: { id: collectionId },
    select: { id: true, name: true, folderPath: true, parentId: true } as any,
  })) as { id: string; name: string; folderPath?: string | null; parentId?: string | null } | null;
  if (!col) return "";
  if (col.folderPath) return col.folderPath;

  const parts: string[] = [sanitizeFileName(col.name)];
  let currParentId = col.parentId;
  while (currParentId) {
    const parent = (await prisma.collection.findUnique({
      where: { id: currParentId },
      select: { id: true, name: true, folderPath: true, parentId: true } as any,
    })) as { id: string; name: string; folderPath?: string | null; parentId?: string | null } | null;
    if (!parent) break;
    if (parent.folderPath) {
      parts.unshift(parent.folderPath);
      break;
    }
    parts.unshift(sanitizeFileName(parent.name));
    currParentId = parent.parentId;
  }
  return path.join(...parts);
}

/**
 * Cria fisicamente a pasta de uma coleção no disco do repositório/biblioteca,
 * suportando aninhamento caso parentId seja fornecido.
 */
export async function ensureCollectionFolder(
  collectionName: string,
  libraryId?: string,
  parentId?: string | null
): Promise<string[]> {
  const safeName = sanitizeFileName(collectionName);
  let parentFolderPath = "";

  if (parentId) {
    parentFolderPath = await getCollectionFolderPath(parentId);
  }

  const relativeFolderPath = parentFolderPath
    ? path.join(parentFolderPath, safeName)
    : safeName;

  const createdPaths: string[] = [];

  if (libraryId) {
    const library = await prisma.library.findUnique({ where: { id: libraryId } });
    if (library) {
      const colDir = path.join(path.resolve(library.path), relativeFolderPath);
      await fs.promises.mkdir(colDir, { recursive: true });
      createdPaths.push(colDir);
    }
  } else {
    const libraries = await prisma.library.findMany({ where: { enabled: true } });
    for (const lib of libraries) {
      const colDir = path.join(path.resolve(lib.path), relativeFolderPath);
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
        folderPath: colName,
        description: "Coleção de arquivos baixados via link da internet",
      } as any,
    });
  } else if (!(collection as any).folderPath) {
    collection = await prisma.collection.update({
      where: { id: collection.id },
      data: { folderPath: colName } as any,
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
  let targetRelFolder = "";
  if (targetCollectionId) {
    targetCol = await prisma.collection.findUnique({
      where: { id: targetCollectionId },
    });
    if (!targetCol) {
      throw new Error(`Coleção de destino não encontrada: ${targetCollectionId}`);
    }
    targetRelFolder = await getCollectionFolderPath(targetCol.id);
  }

  const libRoot = path.resolve(model.library.path);
  const currentDiskPath = path.join(libRoot, model.folderPath);

  // Pasta de destino: se houver coleção, usa seu caminho relativo aninhado completo; se null, usa a raiz da biblioteca
  const targetDir = targetRelFolder
    ? path.join(libRoot, targetRelFolder)
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

/**
 * Renomeia fisicamente a pasta de uma coleção no disco e atualiza o folderPath
 * da coleção, de suas subcoleções descendentes e dos modelos contidos.
 */
export async function renameCollectionFolder(collectionId: string, newName: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });
  if (!collection) {
    throw new Error(`Coleção não encontrada: ${collectionId}`);
  }

  const cleanNewName = sanitizeFileName(newName);
  if (!cleanNewName) {
    throw new Error("Novo nome de coleção inválido");
  }

  const oldFolderPath = await getCollectionFolderPath(collectionId);
  const parentFolderPath = (collection as any).parentId
    ? await getCollectionFolderPath((collection as any).parentId)
    : "";
  const newFolderPath = parentFolderPath
    ? path.join(parentFolderPath, cleanNewName)
    : cleanNewName;

  if (oldFolderPath === newFolderPath) {
    if (collection.name !== newName.trim()) {
      return await prisma.collection.update({
        where: { id: collectionId },
        data: { name: newName.trim() },
      });
    }
    return collection;
  }

  // Renomeia fisicamente no disco nas bibliotecas ativas
  const libraries = await prisma.library.findMany({ where: { enabled: true } });
  for (const lib of libraries) {
    const libRoot = path.resolve(lib.path);
    const oldDiskDir = path.join(libRoot, oldFolderPath);
    const newDiskDir = path.join(libRoot, newFolderPath);

    if (fs.existsSync(oldDiskDir)) {
      await safeMove(oldDiskDir, newDiskDir);
    }
  }

  // Gera slug único para a nova pasta
  let newSlug = slugifyCollection(newFolderPath.replace(/[/\\]+/g, "-"));
  let existingWithSlug = await prisma.collection.findFirst({
    where: { slug: newSlug, NOT: { id: collectionId } },
  });
  if (existingWithSlug) {
    newSlug = `${newSlug}-${Date.now().toString(36)}`;
  }

  const updatedCol = await prisma.collection.update({
    where: { id: collectionId },
    data: {
      name: newName.trim(),
      slug: newSlug,
      folderPath: newFolderPath,
    } as any,
  });

  // Atualiza em cascata subcoleções filhas e descendentes
  const allCollections = (await prisma.collection.findMany()) as any[];
  for (const col of allCollections) {
    if (col.id === collectionId) continue;
    if (col.folderPath && (col.folderPath === oldFolderPath || col.folderPath.startsWith(oldFolderPath + "/"))) {
      const subRel = col.folderPath.slice(oldFolderPath.length);
      const updatedSubPath = newFolderPath + subRel;
      let subSlug = slugifyCollection(updatedSubPath.replace(/[/\\]+/g, "-"));
      const slugClash = await prisma.collection.findFirst({
        where: { slug: subSlug, NOT: { id: col.id } },
      });
      if (slugClash) {
        subSlug = `${subSlug}-${Date.now().toString(36)}`;
      }

      await prisma.collection.update({
        where: { id: col.id },
        data: {
          folderPath: updatedSubPath,
          slug: subSlug,
        } as any,
      });
    }
  }

  // Atualiza em cascata modelos afetados
  const affectedModels = await prisma.model.findMany({
    where: {
      folderPath: { startsWith: oldFolderPath },
    },
    include: { files: true, assets: true },
  });

  for (const m of affectedModels) {
    const rest = m.folderPath.slice(oldFolderPath.length);
    const updatedModelFolderPath = newFolderPath + rest;

    await prisma.model.update({
      where: { id: m.id },
      data: { folderPath: updatedModelFolderPath },
    });

    for (const f of m.files) {
      if (f.relativePath.startsWith(oldFolderPath)) {
        await prisma.modelFile.update({
          where: { id: f.id },
          data: {
            relativePath: newFolderPath + f.relativePath.slice(oldFolderPath.length),
          },
        });
      }
    }

    for (const a of m.assets) {
      if (a.relativePath.startsWith(oldFolderPath)) {
        await prisma.modelAsset.update({
          where: { id: a.id },
          data: {
            relativePath: newFolderPath + a.relativePath.slice(oldFolderPath.length),
          },
        });
      }
    }

    if (m.coverImage && m.coverImage.includes(encodeURIComponent(oldFolderPath))) {
      const updatedCover = m.coverImage.replace(
        encodeURIComponent(oldFolderPath),
        encodeURIComponent(newFolderPath)
      );
      await prisma.model.update({
        where: { id: m.id },
        data: { coverImage: updatedCover },
      });
    }
  }

  return updatedCol;
}

