import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { sanitizeFileName, slugifyCollection } from "@/lib/storage/file-ops";

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

async function main() {
  console.log("=== INICIANDO MIGRAÇÃO DE COLEÇÕES HIERÁRQUICAS ===");

  const libraries = await prisma.library.findMany({ where: { enabled: true } });
  console.log(`Encontradas ${libraries.length} biblioteca(s) ativas.`);

  let collectionsCreated = 0;
  let collectionsUpdated = 0;
  let modelsReassigned = 0;

  for (const lib of libraries) {
    let libRoot = path.resolve(lib.path);
    if (!fs.existsSync(libRoot)) {
      const hostPath = path.resolve(process.cwd(), lib.path.replace(/^\//, ""));
      if (fs.existsSync(hostPath)) {
        libRoot = hostPath;
      }
    }
    console.log(`\nProcessando biblioteca: ${lib.name} (${libRoot})`);

    if (!fs.existsSync(libRoot)) {
      console.warn(`Diretório da biblioteca não encontrado: ${libRoot}`);
      continue;
    }

    // Cache de coleções em memória
    const existingCols = (await prisma.collection.findMany()) as any[];
    const colByPath = new Map<string, any>();
    for (const c of existingCols) {
      if (c.folderPath) {
        colByPath.set(c.folderPath.replace(/\\/g, "/"), c);
      }
      colByPath.set(c.slug, c);
    }

    // Helper para garantir coleção e seus ancestrais
    async function ensureHierarchy(relFolderPath: string) {
      const parts = relFolderPath.split(/[/\\]+/).filter((p) => p && p !== ".");
      if (parts.length === 0) return null;

      let currentParentId: string | null = null;
      let accumulatedPath = "";
      let leafCol: any = null;

      for (let i = 0; i < parts.length; i++) {
        const partName = parts[i];
        accumulatedPath = accumulatedPath ? `${accumulatedPath}/${partName}` : partName;
        const normPath = accumulatedPath.replace(/\\/g, "/");

        let col: any = colByPath.get(normPath);
        if (!col) {
          const colSlug = slugifyCollection(normPath.replace(/[/\\]+/g, "-"));

          col = await prisma.collection.findFirst({
            where: {
              OR: [
                { folderPath: normPath },
                { slug: colSlug },
                { name: partName, parentId: currentParentId },
              ],
            } as any,
          });

          if (!col) {
            col = await prisma.collection.create({
              data: {
                name: partName,
                slug: colSlug,
                folderPath: normPath,
                parentId: currentParentId,
                description: `Coleção criada automaticamente da pasta ${partName}`,
              } as any,
            });
            collectionsCreated++;
            console.log(`[+] Criada coleção: "${partName}" (caminho: ${normPath})`);
          } else {
            if (col.folderPath !== normPath || col.parentId !== currentParentId) {
              col = await prisma.collection.update({
                where: { id: col.id },
                data: {
                  folderPath: normPath,
                  parentId: currentParentId,
                } as any,
              });
              collectionsUpdated++;
              console.log(`[*] Atualizada coleção: "${col.name}" -> parentId: ${currentParentId}, path: ${normPath}`);
            }
          }

          colByPath.set(normPath, col);
          colByPath.set(col.slug, col);
        }

        currentParentId = col.id;
        leafCol = col;
      }

      return leafCol;
    }

    // Varre todas as pastas da biblioteca
    async function scanDirs(currentDir: string) {
      let entries: fs.Dirent[];
      try {
        entries = await fs.promises.readdir(currentDir, { withFileTypes: true });
      } catch {
        return;
      }

      const relDir = path.relative(libRoot, currentDir) || ".";
      if (relDir !== ".") {
        await ensureHierarchy(relDir);
      }

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const name = entry.name;
        if (IGNORED_DIRS.has(name.toLowerCase()) || name.startsWith(".")) continue;
        await scanDirs(path.join(currentDir, name));
      }
    }

    await scanDirs(libRoot);

    // Agora reatribui os modelos para suas coleções corretas
    const models = await prisma.model.findMany({
      where: { libraryId: lib.id },
    });

    for (const model of models) {
      const modelRel = model.folderPath.replace(/\\/g, "/");
      const diskFullPath = path.join(libRoot, model.folderPath);
      const isDir = fs.existsSync(diskFullPath) && fs.statSync(diskFullPath).isDirectory();

      let targetColPath = "";
      if (isDir) {
        // Se o modelo é uma pasta de projeto (ex: sample_library/Articulated_Dragon), a coleção é a pasta pai
        const parts = modelRel.split("/").filter(Boolean);
        if (parts.length > 1) {
          targetColPath = parts.slice(0, -1).join("/");
        }
      } else {
        // Se o modelo é um arquivo (ex: Canecas/teste/file.3mf ou Santos/santa.3mf)
        const parts = modelRel.split("/").filter(Boolean);
        if (parts.length > 1) {
          targetColPath = parts.slice(0, -1).join("/");
        }
      }

      if (targetColPath) {
        const col = await ensureHierarchy(targetColPath);
        if (col && model.collectionId !== col.id) {
          await prisma.model.update({
            where: { id: model.id },
            data: { collectionId: col.id },
          });
          modelsReassigned++;
          console.log(`[->] Modelo "${model.name}" reatribuído para coleção "${col.name}" (${targetColPath})`);
        }
      }
    }
  }

  console.log("\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===");
  console.log(`- Coleções criadas: ${collectionsCreated}`);
  console.log(`- Coleções atualizadas com hierarquia: ${collectionsUpdated}`);
  console.log(`- Modelos reorganizados: ${modelsReassigned}`);
}

main()
  .catch((e) => {
    console.error("Erro fatal durante a migração:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
