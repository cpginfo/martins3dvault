import path from "path";

export interface CompanionAnalysis {
  coverImageFile?: string;
  allImages: string[];
  manualPdfs: string[];
  gcodeFiles: string[];
}

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".bmp",
  ".avif",
  ".tif",
  ".tiff",
]);

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
 * Procura a melhor imagem de capa para um arquivo 3D ou pasta.
 * Prioridades:
 * 1. Nome base exato (case-insensitive):
 *    ex: "peca.stl" -> "peca.png", "peca.jpg", "peca.jpeg", "peca.webp"
 * 2. Nome base normalizado (sem acentos/espaços):
 *    ex: "peca_v1.stl" -> "peca v1.png"
 */
export function findMatchingImage(
  candidateImages: string[],
  targetNameOrFile?: string
): string | undefined {
  if (!targetNameOrFile || candidateImages.length === 0) return undefined;

  const targetBase = path.parse(targetNameOrFile).name.toLowerCase().trim();
  const targetNorm = normalizeBaseName(targetNameOrFile);

  // 1. Nome base idêntico (case-insensitive): ex: modelo.stl -> modelo.png / modelo.jpg / modelo.webp
  const exactMatch = candidateImages.find((img) => {
    const imgBase = path.parse(img).name.toLowerCase().trim();
    return imgBase === targetBase;
  });
  if (exactMatch) return exactMatch;

  // 2. Nome normalizado (sem acentos, pontuação): ex: modelo_v2.stl -> modelo v2.jpg
  const normMatch = candidateImages.find((img) => normalizeBaseName(img) === targetNorm);
  if (normMatch) return normMatch;

  return undefined;
}

/**
 * Analisa arquivos irmãos em uma pasta para descobrir imagens de capa e manuais PDF
 */
export function analyzeFolderCompanions(
  filesInFolder: string[],
  primary3DFileName?: string,
  folderName?: string
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

  // 1. Tenta correspondência exata ou normalizada com o arquivo 3D principal (.png, .jpg, .jpeg, .webp, etc.)
  if (primary3DFileName) {
    coverImageFile = findMatchingImage(allImages, primary3DFileName);
  }

  // 2. Tenta correspondência com o nome da pasta (ex: Pasta "Caneca" com "Caneca.png")
  if (!coverImageFile && folderName) {
    coverImageFile = findMatchingImage(allImages, folderName);
  }

  // 3. Tenta encontrar nomes prioritários como cover.png, preview.jpg, render.webp
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

  // 4. Fallback: primeira imagem encontrada na pasta (apenas quando não é busca de arquivo específico)
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
