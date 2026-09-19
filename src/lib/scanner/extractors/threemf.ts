import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export interface ThreeMfResult {
  thumbnailPath?: string;
  filamentType?: string;
  layerHeight?: number;
  nozzleSize?: number;
}

const THUMBNAIL_PATTERNS = [
  /^metadata\/thumbnail\.(png|jpg|jpeg)$/i,
  /^metadata\/slice_info\.(png|jpg|jpeg)$/i,
  /^metadata\/plate_\d+\.(png|jpg|jpeg)$/i,
  /^metadata\/.*thumbnail.*\.(png|jpg|jpeg)$/i,
  /^thumbnail\.(png|jpg|jpeg)$/i,
  /^thumbnail\/.*\.(png|jpg|jpeg)$/i,
];

/**
 * Extrai thumbnails embutidas e parâmetros de fatiamento de arquivos .3mf (formato OPC/ZIP)
 */
export async function extractThreeMfMetadata(
  filePath: string,
  modelId: string,
  storageDataPath: string
): Promise<ThreeMfResult> {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    let thumbnailPath: string | undefined;
    let filamentType: string | undefined;
    let layerHeight: number | undefined;

    // Procura por entradas de thumbnail
    for (const entry of entries) {
      const entryName = entry.entryName.replace(/\\/g, "/");

      const isThumbnail = THUMBNAIL_PATTERNS.some((pattern) => pattern.test(entryName));

      if (isThumbnail && !thumbnailPath) {
        const ext = path.extname(entryName) || ".png";
        const thumbDir = path.join(storageDataPath, "thumbnails");
        await fs.promises.mkdir(thumbDir, { recursive: true });

        const fileName = `${modelId}_thumb${ext}`;
        const fullDestPath = path.join(thumbDir, fileName);

        const buffer = entry.getData();
        if (buffer && buffer.length > 0) {
          await fs.promises.writeFile(fullDestPath, buffer);
          thumbnailPath = `/api/assets/thumbnails/${fileName}`;
        }
      }

      // Procura por metadados de impressão se houver slice_info
      if (entryName.toLowerCase().includes("slice_info.config") || entryName.toLowerCase().includes("model_settings.config")) {
        try {
          const configText = entry.getData().toString("utf8");
          const filamentMatch = configText.match(/filament(?:_type)?\s*=\s*([^\r\n]+)/i);
          if (filamentMatch) filamentType = filamentMatch[1].trim();

          const layerMatch = configText.match(/layer_height\s*=\s*([0-9.]+)/i);
          if (layerMatch) layerHeight = parseFloat(layerMatch[1]);
        } catch {
          // Ignora falha de parse textual secundário
        }
      }
    }

    return {
      thumbnailPath,
      filamentType,
      layerHeight,
    };
  } catch (err) {
    console.warn(`Aviso ao inspecionar .3mf: ${filePath}`, err);
    return {};
  }
}
