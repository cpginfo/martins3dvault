import path from "path";
import fs from "fs";

export interface CompanionAnalysis {
  coverImageFile?: string;
  allImages: string[];
  manualPdfs: string[];
  gcodeFiles: string[];
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);
const COVER_PRIORITY_NAMES = ["cover", "preview", "render", "thumbnail", "photo", "main"];

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
 * Analisa arquivos irmãos em uma pasta para descobrir imagens de capa e manuais PDF
 */
export function analyzeFolderCompanions(
  filesInFolder: string[],
  primary3DFileName?: string
): CompanionAnalysis {
  const allImages: string[] = [];
  const manualPdfs: string[] = [];
  const gcodeFiles: string[] = [];

  for (const file of filesInFolder) {
    const ext = path.extname(file).toLowerCase();
    if (IMAGE_EXTENSIONS.has(ext)) {
      allImages.push(file);
    } else if (ext === ".pdf") {
      manualPdfs.push(file);
    } else if (ext === ".gcode" || ext === ".bgcode") {
      gcodeFiles.push(file);
    }
  }

  let coverImageFile: string | undefined;

  // 1. Tenta correspondência de nome normalizado com o arquivo 3D principal (ex: Caneca FLAMENGO..3mf -> Caneca Flamengo.jpg)
  if (primary3DFileName) {
    const normPrimary = normalizeBaseName(primary3DFileName);
    coverImageFile = allImages.find((img) => normalizeBaseName(img) === normPrimary);
  }

  // 2. Tenta encontrar nomes prioritários como cover.png, preview.jpg
  if (!coverImageFile) {
    for (const priority of COVER_PRIORITY_NAMES) {
      const match = allImages.find((img) => {
        const name = path.parse(img).name.toLowerCase();
        return name === priority || name.startsWith(priority);
      });
      if (match) {
        coverImageFile = match;
        break;
      }
    }
  }

  // 3. Fallback: primeira imagem encontrada na pasta (apenas quando não é busca de arquivo específico)
  if (!coverImageFile && !primary3DFileName && allImages.length > 0) {
    coverImageFile = allImages[0];
  }

  return {
    coverImageFile,
    allImages,
    manualPdfs,
    gcodeFiles,
  };
}
