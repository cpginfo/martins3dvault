import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { parseStlFile } from "./extractors/stl-parser";
import { extractThreeMfMetadata } from "./extractors/threemf";
import { analyzeFolderCompanions, normalizeBaseName, findMatchingImage } from "./extractors/companion";

const SUPPORTED_3D_EXTENSIONS = new Set([".stl", ".3mf", ".obj", ".step", ".stp"]);
const IGNORED_DIRS = new Set([
  "@eadir",
  ".git",
  ".svn",
  ".next",
  "node_modules",
  "__macosx",
  ".ds_store",
  "thumbs.db",
]);

export interface ScanStats {
  scannedFolders: number;
  addedModels: number;
  updatedModels: number;
  unchangedModels: number;
  deletedModels: number;
  deletedCollections: number;
  errors: string[];
}

export interface ScanOptions {
  subFolder?: string; // Caminho relativo opcional para escanear apenas uma pasta específica
  forceFullScan?: boolean; // Forçar re-processamento completo
}

function slugify(text: string): string {
  return (
    text
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

interface DiscoveredModelTarget {
  name: string;
  folderPath: string; // Caminho relativo único à biblioteca
  absDir: string;
  collectionName?: string;
  collectionPath?: string; // Caminho relativo da coleção na hierarquia (ex: Casa/Cozinha)
  threeDFiles: string[];
  companionFiles: string[];
  manualFiles: string[];
  primaryCoverImage?: string;
}

export async function scanLibrary(
  libraryId: string,
  options?: ScanOptions
): Promise<ScanStats> {
  const library = await prisma.library.findUnique({
    where: { id: libraryId },
  });

  if (!library) {
    throw new Error(`Biblioteca não encontrada com ID: ${libraryId}`);
  }

  const scanJob = await prisma.scanJob.create({
    data: {
      libraryId: library.id,
      status: "RUNNING",
    },
  });

  await prisma.library.update({
    where: { id: library.id },
    data: { scanStatus: "SCANNING", lastError: null },
  });

  const stats: ScanStats = {
    scannedFolders: 0,
    addedModels: 0,
    updatedModels: 0,
    unchangedModels: 0,
    deletedModels: 0,
    deletedCollections: 0,
    errors: [],
  };

  const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";

  try {
    const rootPath = path.resolve(library.path);
    if (!fs.existsSync(rootPath)) {
      throw new Error(`Caminho da biblioteca não existe: ${rootPath}`);
    }

    // Define o ponto de partida do walk (toda a biblioteca ou uma subpasta específica)
    let scanStartDir = rootPath;
    if (options?.subFolder) {
      scanStartDir = path.resolve(rootPath, options.subFolder);
      if (!fs.existsSync(scanStartDir)) {
        throw new Error(`Subpasta não encontrada: ${options.subFolder}`);
      }
    }

    // Cache de coleções existentes no banco
    const collections = await prisma.collection.findMany();
    const collectionMap = new Map<string, (typeof collections)[0]>();
    for (const c of collections) {
      collectionMap.set(c.slug, c);
      if (c.folderPath) {
        collectionMap.set(c.folderPath.replace(/\\/g, "/"), c);
      }
    }

    // Função para garantir a hierarquia completa de uma coleção de forma recursiva
    async function ensureHierarchyForPath(relColPath: string) {
      const parts = relColPath.split(/[/\\]+/).filter((p) => p && p !== ".");
      if (parts.length === 0) return null;

      let currentParentId: string | null = null;
      let accumulatedPath = "";
      let leafCol: (typeof collections)[0] | null = null;

      for (let i = 0; i < parts.length; i++) {
        const partName = parts[i];
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${partName}` : partName;
        const normalizedAccumPath = accumulatedPath.replace(/\\/g, "/");

        let col: (typeof collections)[0] | null | undefined =
          collectionMap.get(normalizedAccumPath);
        if (!col) {
          const colSlug = slugify(normalizedAccumPath.replace(/[/\\]+/g, "-"));

          col = await prisma.collection.findFirst({
            where: {
              OR: [
                { folderPath: normalizedAccumPath },
                { slug: colSlug },
                { name: partName, parentId: currentParentId },
              ],
            },
          });

          if (!col) {
            col = await prisma.collection.create({
              data: {
                name: partName,
                slug: colSlug,
                folderPath: normalizedAccumPath,
                parentId: currentParentId,
                description: `Coleção criada automaticamente da pasta ${partName}`,
              },
            });
          } else {
            // Atualiza folderPath ou parentId se necessário
            if (col.folderPath !== normalizedAccumPath || col.parentId !== currentParentId) {
              col = await prisma.collection.update({
                where: { id: col.id },
                data: {
                  folderPath: normalizedAccumPath,
                  parentId: currentParentId,
                },
              });
            }
          }
          collectionMap.set(normalizedAccumPath, col);
          collectionMap.set(col.slug, col);
        }

        currentParentId = col.id;
        leafCol = col;
      }

      return leafCol;
    }

    // Carrega modelos existentes da biblioteca para sincronização diferencial
    const existingDbModels = await prisma.model.findMany({
      where: { libraryId: library.id },
      include: { files: true, assets: true },
    });
    const dbModelByPath = new Map(existingDbModels.map((m) => [m.folderPath, m]));

    // 0. Prova de I/O com timeout de segurança para prevenir travamento por queda de NFS/CIFS
    let rootEntries: fs.Dirent[];
    try {
      rootEntries = await Promise.race([
        fs.promises.readdir(scanStartDir, { withFileTypes: true }),
        new Promise<fs.Dirent[]>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  `Timeout de I/O (5000ms) ao tentar listar '${scanStartDir}'. O ponto de montagem NAS (NFS/CIFS) pode estar travado ou desconectado.`
                )
              ),
            5000
          )
        ),
      ]);
    } catch (ioErr: any) {
      throw new Error(`Falha crítica de comunicação com o armazenamento em '${scanStartDir}': ${ioErr.message}`);
    }

    // Trava de segurança NAS: Se o diretório base estiver vazio mas houver modelos no banco, aborta
    if (!options?.subFolder && rootEntries.length === 0 && existingDbModels.length > 0) {
      throw new Error(
        `[TRAVA DE SEGURANÇA NAS] O diretório '${scanStartDir}' está completamente vazio no disco, mas a biblioteca possui ${existingDbModels.length} modelos cadastrados no banco de dados. Varredura abortada para impedir exclusão acidental em massa (possível perda de montagem NFS/CIFS).`
      );
    }

    const discoveredTargets: DiscoveredModelTarget[] = [];
    const discoveredFolderPaths = new Set<string>();

    // Função recursiva para percorrer as pastas do disco
    async function walk(currentDir: string) {
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch (err: any) {
        stats.errors.push(`Falha ao ler diretório ${currentDir}: ${err.message}`);
        return;
      }

      const filesInDir: string[] = [];
      const subDirs: string[] = [];

      for (const entry of entries) {
        const name = entry.name;
        if (IGNORED_DIRS.has(name.toLowerCase()) || name.startsWith(".")) {
          continue;
        }

        if (entry.isDirectory()) {
          subDirs.push(path.join(currentDir, name));
        } else if (entry.isFile()) {
          filesInDir.push(name);
        }
      }

      const threeDFiles = filesInDir.filter((file) =>
        SUPPORTED_3D_EXTENSIONS.has(path.extname(file).toLowerCase())
      );

      if (threeDFiles.length > 0) {
        stats.scannedFolders++;
        const relDir = path.relative(rootPath, currentDir) || ".";
        const dirParts = relDir.split(path.sep).filter((p) => p && p !== ".");

        const companionInfo = analyzeFolderCompanions(filesInDir);

        // Se tem arquivo .3mf OU imagens casando individualmente com cada arquivo
        // OU múltiplos projetos independentes OU estamos na raiz da biblioteca
        const has3mf = threeDFiles.some((f) => path.extname(f).toLowerCase() === ".3mf");
        const hasMatchingImages = threeDFiles.some((f) => !!findMatchingImage(companionInfo.allImages, f));
        const isIndividualFiles =
          relDir === "." ||
          has3mf ||
          hasMatchingImages ||
          threeDFiles.length > 1;

        if (isIndividualFiles) {
          // A pasta atual é a coleção da qual os arquivos fazem parte
          const collectionPath = relDir === "." ? undefined : relDir;
          const collectionName = dirParts.length > 0 ? dirParts[dirParts.length - 1] : undefined;

          // Cada arquivo 3D vira um modelo individual dentro da pasta/coleção
          for (const file of threeDFiles) {
            const baseName = path.parse(file).name;
            const fileRelPath = relDir === "." ? file : path.join(relDir, file);

            // Procura capa correspondente a este arquivo específico (.png, .jpg, .jpeg, .webp)
            const matchingImage = findMatchingImage(companionInfo.allImages, file);

            discoveredTargets.push({
              name: baseName.replace(/[._-]+/g, " ").trim(),
              folderPath: fileRelPath,
              absDir: currentDir,
              collectionName,
              collectionPath,
              threeDFiles: [file],
              companionFiles: matchingImage ? [matchingImage] : [],
              manualFiles: companionInfo.manualPdfs,
              primaryCoverImage: matchingImage,
            });
            discoveredFolderPaths.add(fileRelPath);
          }
        } else {
          // Trata a pasta como um único modelo multi-peças (ex: Articulated_Dragon com vários .stl de peças)
          const folderName =
            relDir === "." ? path.basename(rootPath) : path.basename(currentDir);
          const targetPath = relDir;

          // A coleção deste modelo é a pasta pai da pasta do modelo
          const parentDirParts = dirParts.slice(0, -1);
          const collectionPath = parentDirParts.length > 0 ? parentDirParts.join(path.sep) : undefined;
          const collectionName = parentDirParts.length > 0 ? parentDirParts[parentDirParts.length - 1] : undefined;

          // Procura imagem de capa correspondente ao arquivo principal, à pasta ou prioridade
          const primaryFile = threeDFiles[0];
          const matchingCover =
            findMatchingImage(companionInfo.allImages, primaryFile) ||
            findMatchingImage(companionInfo.allImages, folderName) ||
            companionInfo.coverImageFile;

          discoveredTargets.push({
            name: folderName.replace(/[_-]/g, " "),
            folderPath: targetPath,
            absDir: currentDir,
            collectionName,
            collectionPath,
            threeDFiles,
            companionFiles: companionInfo.allImages,
            manualFiles: companionInfo.manualPdfs,
            primaryCoverImage: matchingCover,
          });
          discoveredFolderPaths.add(targetPath);
        }
      }

      for (const dir of subDirs) {
        await walk(dir);
      }
    }

    await walk(scanStartDir);

    // Conjunto de IDs de modelos renomeados/migrados para não serem excluídos como órfãos
    const migratedModelIds = new Set<string>();

    // 1. Processa cada alvo descoberto (Verificação Diferencial Inteligente)
    for (const target of discoveredTargets) {
      try {
        // Garante que a Coleção e toda a sua hierarquia existam
        let targetCollectionId: string | null = null;
        if (target.collectionPath) {
          const col = await ensureHierarchyForPath(target.collectionPath);
          if (col) {
            targetCollectionId = col.id;
          }
        } else if (target.collectionName) {
          const col = await ensureHierarchyForPath(target.collectionName);
          if (col) {
            targetCollectionId = col.id;
          }
        }

        // Tenta encontrar o modelo por folderPath exato
        let existingModel = dbModelByPath.get(target.folderPath);

        // Se não encontrar por folderPath, verifica se foi renomeado ou movido
        if (!existingModel && target.threeDFiles.length > 0) {
          const primaryFile = target.threeDFiles[0];
          const primaryFilePath = path.join(target.absDir, primaryFile);
          try {
            const stat = await fs.promises.stat(primaryFilePath);
            const fileSizeBigInt = BigInt(stat.size);

            const candidate = existingDbModels.find(
              (m) =>
                !discoveredFolderPaths.has(m.folderPath) &&
                !migratedModelIds.has(m.id) &&
                m.files.some(
                  (f) =>
                    f.fileName === primaryFile &&
                    BigInt(f.fileSize) === fileSizeBigInt
                )
            );

            if (candidate) {
              existingModel = await prisma.model.update({
                where: { id: candidate.id },
                data: {
                  name: target.name,
                  slug: slugify(target.name),
                  folderPath: target.folderPath,
                  collectionId: targetCollectionId || candidate.collectionId,
                },
                include: { files: true, assets: true },
              });
              migratedModelIds.add(candidate.id);
              stats.updatedModels++;
            }
          } catch {
            // Ignora falha de stat temporária
          }
        }

        // Calcula a capa esperada para o modelo
        let computedCover = existingModel?.coverImage || null;
        if (target.primaryCoverImage) {
          const relDir = path.relative(rootPath, target.absDir);
          const imgRelPath =
            relDir === "."
              ? target.primaryCoverImage
              : path.join(relDir, target.primaryCoverImage);
          computedCover = `/api/assets/file?libraryId=${library.id}&relPath=${encodeURIComponent(imgRelPath)}`;
        }

        // === VERIFICAÇÃO DIFERENCIAL INCREMENTAL ===
        // Se o modelo já existe no banco e não forçado, verificamos se algo mudou antes de tocar no banco
        if (existingModel && !options?.forceFullScan) {
          let hasChanges = false;

          // A. Coleção ou Nome mudou?
          if (targetCollectionId && existingModel.collectionId !== targetCollectionId) {
            hasChanges = true;
          }
          if (existingModel.name !== target.name) {
            hasChanges = true;
          }

          // B. Capa mudou?
          if (computedCover !== existingModel.coverImage) {
            hasChanges = true;
          }

          // C. Lista ou conteúdo de arquivos 3D mudou?
          if (!hasChanges) {
            if (existingModel.files.length !== target.threeDFiles.length) {
              hasChanges = true;
            } else {
              for (const fileName of target.threeDFiles) {
                const existingFile = existingModel.files.find((f) => f.fileName === fileName);
                if (!existingFile) {
                  hasChanges = true;
                  break;
                }
                const fullFilePath = path.join(target.absDir, fileName);
                try {
                  const stat = await fs.promises.stat(fullFilePath);
                  const fileHash = `${stat.mtimeMs}_${stat.size}`;
                  if (existingFile.fileHash !== fileHash) {
                    hasChanges = true;
                    break;
                  }
                } catch {
                  hasChanges = true;
                  break;
                }
              }
            }
          }

          // D. Lista ou conteúdo de assets (imagens/manuais) mudou?
          if (!hasChanges) {
            const currentAssetsList = [...target.companionFiles, ...target.manualFiles];
            if (existingModel.assets.length !== currentAssetsList.length) {
              hasChanges = true;
            } else {
              for (const assetName of currentAssetsList) {
                const existingAsset = existingModel.assets.find((a) => a.fileName === assetName);
                if (!existingAsset) {
                  hasChanges = true;
                  break;
                }
                const fullAssetPath = path.join(target.absDir, assetName);
                try {
                  const stat = await fs.promises.stat(fullAssetPath);
                  if (BigInt(stat.size) !== BigInt(existingAsset.fileSize)) {
                    hasChanges = true;
                    break;
                  }
                } catch {
                  hasChanges = true;
                  break;
                }
              }
            }
          }

          // Se nada mudou: pula imediatamente o processamento pesado!
          if (!hasChanges) {
            stats.unchangedModels++;
            continue; // PULA! Zero I/O no banco e zero processamento de malha
          }
        }

        // Se é um modelo novo ou sofreu alterações reais:
        let modelCover = computedCover;

        if (!existingModel) {
          existingModel = await prisma.model.create({
            data: {
              libraryId: library.id,
              name: target.name,
              slug: slugify(target.name),
              folderPath: target.folderPath,
              collectionId: targetCollectionId,
              coverImage: modelCover,
            },
            include: { files: true, assets: true },
          });
          stats.addedModels++;
        } else {
          // Atualiza dados cadastrais
          existingModel = await prisma.model.update({
            where: { id: existingModel.id },
            data: {
              name: target.name,
              collectionId: targetCollectionId || existingModel.collectionId,
              coverImage: modelCover,
            },
            include: { files: true, assets: true },
          });
          stats.updatedModels++;
        }

        const modelId = existingModel.id;

        // Sincroniza arquivos 3D do modelo
        const current3DFilesSet = new Set(target.threeDFiles);

        // Remove arquivos 3D excluídos do disco
        for (const fileRecord of existingModel.files) {
          if (!current3DFilesSet.has(fileRecord.fileName)) {
            await prisma.modelFile.delete({ where: { id: fileRecord.id } });
          }
        }

        // Processa apenas arquivos 3D novos ou modificados
        for (let i = 0; i < target.threeDFiles.length; i++) {
          const fileName = target.threeDFiles[i];
          const fullFilePath = path.join(target.absDir, fileName);
          const ext = path.extname(fileName).toLowerCase();
          const format = ext.replace(".", "").toUpperCase();

          const stat = await fs.promises.stat(fullFilePath);
          const fileHash = `${stat.mtimeMs}_${stat.size}`;

          const existingFile = existingModel.files.find((f) => f.fileName === fileName);

          // Se o arquivo 3D específico está inalterado, não precisa re-parsear STL/3MF
          if (existingFile && existingFile.fileHash === fileHash && !options?.forceFullScan) {
            continue;
          }

          let dimensionsX: number | null = null;
          let dimensionsY: number | null = null;
          let dimensionsZ: number | null = null;
          let triangleCount: number | null = null;

          if (ext === ".stl") {
            const stlMeta = await parseStlFile(fullFilePath);
            if (stlMeta) {
              dimensionsX = stlMeta.dimensionsX;
              dimensionsY = stlMeta.dimensionsY;
              dimensionsZ = stlMeta.dimensionsZ;
              triangleCount = stlMeta.triangleCount;
            }
          }

          if (ext === ".3mf") {
            const threeMfMeta = await extractThreeMfMetadata(
              fullFilePath,
              modelId,
              storageDataPath
            );

            if (threeMfMeta.thumbnailPath && !modelCover) {
              modelCover = threeMfMeta.thumbnailPath;
            }

            // Atualiza parâmetros de fatiamento do modelo
            if (
              modelCover ||
              threeMfMeta.filamentType ||
              threeMfMeta.layerHeight ||
              threeMfMeta.nozzleSize ||
              threeMfMeta.infillDensity
            ) {
              await prisma.model.update({
                where: { id: modelId },
                data: {
                  ...(modelCover ? { coverImage: modelCover } : {}),
                  ...(threeMfMeta.filamentType ? { filamentType: threeMfMeta.filamentType } : {}),
                  ...(threeMfMeta.layerHeight ? { layerHeight: threeMfMeta.layerHeight } : {}),
                  ...(threeMfMeta.nozzleSize ? { nozzleSize: threeMfMeta.nozzleSize } : {}),
                  ...(threeMfMeta.infillDensity ? { infillDensity: threeMfMeta.infillDensity } : {}),
                },
              });
            }

            if (threeMfMeta.triangleCount) {
              triangleCount = threeMfMeta.triangleCount;
            }
            if (threeMfMeta.dimensionsX && threeMfMeta.dimensionsY) {
              dimensionsX = threeMfMeta.dimensionsX;
              dimensionsY = threeMfMeta.dimensionsY;
            }
          }

          const relDir = path.relative(rootPath, target.absDir);
          const fileRelPath = relDir === "." ? fileName : path.join(relDir, fileName);

          if (existingFile) {
            await prisma.modelFile.update({
              where: { id: existingFile.id },
              data: {
                relativePath: fileRelPath,
                fileSize: BigInt(stat.size),
                fileHash,
                dimensionsX,
                dimensionsY,
                dimensionsZ,
                triangleCount,
              },
            });
          } else {
            await prisma.modelFile.create({
              data: {
                modelId,
                fileName,
                relativePath: fileRelPath,
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
        }

        // Sincroniza assets complementares (Imagens e Manuais)
        const currentAssetsSet = new Set([...target.companionFiles, ...target.manualFiles]);

        // Remove assets excluídos do disco
        for (const assetRecord of existingModel.assets) {
          if (!currentAssetsSet.has(assetRecord.fileName)) {
            await prisma.modelAsset.delete({ where: { id: assetRecord.id } });
          }
        }

        // Adiciona novas imagens
        for (const img of target.companionFiles) {
          const imgPath = path.join(target.absDir, img);
          if (!fs.existsSync(imgPath)) continue;
          const stat = await fs.promises.stat(imgPath);
          const relDir = path.relative(rootPath, target.absDir);
          const rel = relDir === "." ? img : path.join(relDir, img);

          const existingAsset = existingModel.assets.find((a) => a.fileName === img);
          if (!existingAsset) {
            await prisma.modelAsset.create({
              data: {
                modelId,
                fileName: img,
                relativePath: rel,
                assetType: "IMAGE",
                fileSize: BigInt(stat.size),
              },
            });
          }
        }

        // Adiciona novos manuais PDF
        for (const pdf of target.manualFiles) {
          const pdfPath = path.join(target.absDir, pdf);
          if (!fs.existsSync(pdfPath)) continue;
          const stat = await fs.promises.stat(pdfPath);
          const relDir = path.relative(rootPath, target.absDir);
          const rel = relDir === "." ? pdf : path.join(relDir, pdf);

          const existingAsset = existingModel.assets.find((a) => a.fileName === pdf);
          if (!existingAsset) {
            await prisma.modelAsset.create({
              data: {
                modelId,
                fileName: pdf,
                relativePath: rel,
                assetType: "PDF_MANUAL",
                fileSize: BigInt(stat.size),
              },
            });
          }
        }

        // Fallback de capa 3MF caso não haja imagem de capa
        if (!modelCover && target.threeDFiles.length > 0) {
          const primaryFile = target.threeDFiles[0];
          if (path.extname(primaryFile).toLowerCase() === ".3mf") {
            const threeMfMeta = await extractThreeMfMetadata(
              path.join(target.absDir, primaryFile),
              modelId,
              storageDataPath
            );
            if (threeMfMeta.thumbnailPath) {
              modelCover = threeMfMeta.thumbnailPath;
            }
          }
        }

        // Atualiza a capa final se foi calculada
        if (modelCover && modelCover !== existingModel.coverImage) {
          await prisma.model.update({
            where: { id: modelId },
            data: { coverImage: modelCover },
          });
        }
      } catch (err: any) {
        stats.errors.push(`Erro ao processar item ${target.folderPath}: ${err.message}`);
      }
    }

    // 2. Remoção de modelos órfãos (que não existem mais no disco)
    if (options?.subFolder) {
      // Se a varredura foi de uma subpasta específica, remove órfãos APENAS daquela subpasta
      const normSubFolder = options.subFolder.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
      for (const dbModel of existingDbModels) {
        const modelRel = dbModel.folderPath.replace(/\\/g, "/");
        const isInScope =
          modelRel === normSubFolder || modelRel.startsWith(normSubFolder + "/");

        if (
          isInScope &&
          !discoveredFolderPaths.has(dbModel.folderPath) &&
          !migratedModelIds.has(dbModel.id)
        ) {
          try {
            await prisma.model.delete({ where: { id: dbModel.id } });
            stats.deletedModels++;
          } catch (err: any) {
            stats.errors.push(`Erro ao remover modelo órfão ${dbModel.name}: ${err.message}`);
          }
        }
      }
    } else {
      // Varredura de biblioteca inteira:
      // Trava de segurança NAS: Se nenhum arquivo foi descoberto mas a biblioteca tinha modelos no banco, aborta!
      if (discoveredFolderPaths.size === 0 && existingDbModels.length > 0) {
        throw new Error(
          `[TRAVA DE SEGURANÇA NAS] Nenhum arquivo foi descoberto durante a varredura da biblioteca '${library.name}', mas existem ${existingDbModels.length} modelos cadastrados no banco. Limpeza de órfãos cancelada para evitar perda de dados.`
        );
      }

      // Varredura de biblioteca inteira: remove órfãos de toda a biblioteca
      for (const dbModel of existingDbModels) {
        if (!discoveredFolderPaths.has(dbModel.folderPath) && !migratedModelIds.has(dbModel.id)) {
          try {
            await prisma.model.delete({
              where: { id: dbModel.id },
            });
            stats.deletedModels++;
          } catch (err: any) {
            stats.errors.push(`Erro ao remover modelo órfão ${dbModel.name}: ${err.message}`);
          }
        }
      }
    }

    // 3. Remoção e espelhamento de coleções excluídas fisicamente (apenas em scan completo e se houver itens válidos no disco)
    if (!options?.subFolder && (discoveredFolderPaths.size > 0 || existingDbModels.length === 0)) {
      const allLibraries = await prisma.library.findMany({ where: { enabled: true } });
      const allDbCollections = await prisma.collection.findMany();

      for (const col of allDbCollections) {
        // Coleção "download" nunca deve ser excluída automaticamente
        if (col.slug === "download") continue;

        const colFolderPath = col.folderPath || col.name;

        // Verifica se a pasta desta coleção existe no disco em pelo menos uma biblioteca ativa e acessível
        const folderExists = allLibraries.some((lib) => {
          const libRoot = path.resolve(lib.path);
          try {
            if (!fs.existsSync(libRoot)) return false;
            const fullPath = path.join(libRoot, colFolderPath);
            return fs.existsSync(fullPath);
          } catch {
            return false;
          }
        });

        if (!folderExists) {
          try {
            // Desassocia modelos da coleção removida
            const lingeringModels = await prisma.model.findMany({
              where: { collectionId: col.id },
              select: { id: true, folderPath: true },
            });

            for (const m of lingeringModels) {
              if (!discoveredFolderPaths.has(m.folderPath)) {
                await prisma.model.delete({ where: { id: m.id } }).catch(() => {});
              } else {
                await prisma.model.update({
                  where: { id: m.id },
                  data: { collectionId: null },
                }).catch(() => {});
              }
            }

            await prisma.collection.delete({
              where: { id: col.id },
            });
            stats.deletedCollections++;
          } catch (err: any) {
            stats.errors.push(`Erro ao remover coleção órfã ${col.name}: ${err.message}`);
          }
        }
      }
    }

    // Finaliza o ScanJob com sucesso e relatório incremental
    const summaryMsg = `Scan incremental concluído: ${stats.scannedFolders} pastas analisadas (${stats.unchangedModels} inalteradas, ${stats.addedModels} adicionados, ${stats.updatedModels} modificados, ${stats.deletedModels} removidos).`;

    await prisma.scanJob.update({
      where: { id: scanJob.id },
      data: {
        status: "COMPLETED",
        scannedCount: stats.scannedFolders,
        addedCount: stats.addedModels,
        updatedCount: stats.updatedModels,
        deletedCount: stats.deletedModels,
        log: stats.errors.length > 0 ? stats.errors.join("\n") : summaryMsg,
        completedAt: new Date(),
      },
    });

    await prisma.library.update({
      where: { id: library.id },
      data: {
        scanStatus: "IDLE",
        lastScanAt: new Date(),
      },
    });
  } catch (err: any) {
    stats.errors.push(`Erro fatal no scan: ${err.message}`);

    await prisma.scanJob.update({
      where: { id: scanJob.id },
      data: {
        status: "FAILED",
        log: err.message,
        completedAt: new Date(),
      },
    });

    await prisma.library.update({
      where: { id: library.id },
      data: {
        scanStatus: "ERROR",
        lastError: err.message,
      },
    });
  }

  return stats;
}
