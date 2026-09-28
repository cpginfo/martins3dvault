import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

export interface ThreeMfResult {
  thumbnailPath?: string;
  filamentType?: string;
  layerHeight?: number;
  nozzleSize?: number;
  infillDensity?: number;
  triangleCount?: number;
  dimensionsX?: number;
  dimensionsY?: number;
  dimensionsZ?: number;
}

const THUMBNAIL_PATTERNS = [
  /^metadata\/thumbnail\.(png|jpg|jpeg)$/i,
  /^metadata\/slice_info\.(png|jpg|jpeg)$/i,
  /^metadata\/plate_\d+\.(png|jpg|jpeg)$/i,
  /^metadata\/.*thumbnail.*\.(png|jpg|jpeg)$/i,
  /^metadata\/.*cover.*\.(png|jpg|jpeg)$/i,
  /^thumbnail\.(png|jpg|jpeg)$/i,
  /^thumbnail\/.*\.(png|jpg|jpeg)$/i,
  /^auxiliaries\/.*thumbnail.*\.(png|jpg|jpeg)$/i,
  /^auxiliaries\/.*picture.*\.(png|jpg|jpeg)$/i,
  /^auxiliaries\/.*cover.*\.(png|jpg|jpeg)$/i,
];

/**
 * Extrai thumbnails embutidas e parâmetros técnicos reais de fatiamento de arquivos .3mf (Bambu Studio, OrcaSlicer, PrusaSlicer)
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
    let nozzleSize: number | undefined;
    let infillDensity: number | undefined;
    let triangleCount: number | undefined;
    let dimensionsX: number | undefined;
    let dimensionsY: number | undefined;
    let dimensionsZ: number | undefined;

    // 1. Procura por thumbnail
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
    }

    // 2. Extrai parâmetros do project_settings.config (formato JSON do Bambu Studio / OrcaSlicer)
    const projectSettingsEntry = entries.find((e) =>
      e.entryName.replace(/\\/g, "/").toLowerCase().endsWith("project_settings.config")
    );
    if (projectSettingsEntry) {
      try {
        const cfg = JSON.parse(projectSettingsEntry.getData().toString("utf8"));
        if (Array.isArray(cfg.filament_type) && cfg.filament_type.length > 0) {
          filamentType = String(cfg.filament_type[0]).trim();
        } else if (typeof cfg.filament_type === "string") {
          filamentType = cfg.filament_type.trim();
        }

        if (cfg.layer_height !== undefined && cfg.layer_height !== null) {
          const lh = parseFloat(String(cfg.layer_height));
          if (!isNaN(lh) && lh > 0) layerHeight = lh;
        }

        if (Array.isArray(cfg.nozzle_diameter) && cfg.nozzle_diameter.length > 0) {
          const nz = parseFloat(String(cfg.nozzle_diameter[0]));
          if (!isNaN(nz) && nz > 0) nozzleSize = nz;
        } else if (cfg.nozzle_diameter !== undefined) {
          const nz = parseFloat(String(cfg.nozzle_diameter));
          if (!isNaN(nz) && nz > 0) nozzleSize = nz;
        }

        if (cfg.sparse_infill_density !== undefined && cfg.sparse_infill_density !== null) {
          const infill = parseInt(String(cfg.sparse_infill_density).replace("%", ""), 10);
          if (!isNaN(infill) && infill >= 0) infillDensity = infill;
        }
      } catch {
        // Ignora erro de JSON malformado
      }
    }

    // 3. Extrai contagem real de triângulos do model_settings.config (XML)
    const modelSettingsEntry = entries.find((e) =>
      e.entryName.replace(/\\/g, "/").toLowerCase().endsWith("model_settings.config")
    );
    if (modelSettingsEntry) {
      try {
        const xml = modelSettingsEntry.getData().toString("utf8");
        let totalFaces = 0;
        const matches = xml.matchAll(/face_count="(\d+)"/g);
        for (const m of matches) {
          const count = parseInt(m[1], 10);
          if (!isNaN(count) && count > 0) {
            totalFaces += count;
          }
        }
        if (totalFaces > 0) {
          triangleCount = totalFaces;
        }
      } catch {
        // Ignora erro de parse XML
      }
    }

    // Fallback: se não encontrou triângulos no model_settings.config, procura nós <triangle> em modelos 3D
    if (!triangleCount) {
      let totalTriangles = 0;
      for (const entry of entries) {
        const entryPath = entry.entryName.replace(/\\/g, "/").toLowerCase();
        if (entryPath.startsWith("3d/") && entryPath.endsWith(".model")) {
          try {
            const xml = entry.getData().toString("utf8");
            const matches = xml.match(/<triangle\b/gi);
            if (matches) {
              totalTriangles += matches.length;
            }
          } catch {}
        }
      }
      if (totalTriangles > 0) {
        triangleCount = totalTriangles;
      }
    }

    // 4. Extrai dimensões X e Y da bounding box pré-calculada do fatiador (plate_1.json ou plate_*.json)
    const plateEntry = entries.find((e) =>
      /metadata\/plate_\d+\.json$/i.test(e.entryName.replace(/\\/g, "/"))
    );
    if (plateEntry) {
      try {
        const pData = JSON.parse(plateEntry.getData().toString("utf8"));
        if (Array.isArray(pData.bbox_all)) {
          if (pData.bbox_all.length >= 6) {
            const [minX, minY, minZ, maxX, maxY, maxZ] = pData.bbox_all;
            const diffX = Math.round(Math.abs(maxX - minX));
            const diffY = Math.round(Math.abs(maxY - minY));
            const diffZ = Math.round(Math.abs(maxZ - minZ));
            if (diffX > 0 && diffY > 0) {
              dimensionsX = diffX;
              dimensionsY = diffY;
              if (diffZ > 0) dimensionsZ = diffZ;
            }
          } else if (pData.bbox_all.length >= 4) {
            const [minX, minY, maxX, maxY] = pData.bbox_all;
            const diffX = Math.round(Math.abs(maxX - minX));
            const diffY = Math.round(Math.abs(maxY - minY));
            if (diffX > 0 && diffY > 0) {
              dimensionsX = diffX;
              dimensionsY = diffY;
            }
          }
        }
        // Se ainda não encontrou layerHeight ou nozzleSize, pode estar no plate.json
        if (layerHeight === undefined && pData.bbox_objects?.[0]?.layer_height) {
          layerHeight = parseFloat(String(pData.bbox_objects[0].layer_height));
        }
        if (nozzleSize === undefined && pData.nozzle_diameter) {
          nozzleSize = parseFloat(String(pData.nozzle_diameter));
        }
      } catch {
        // Ignora erro no plate.json
      }
    }

    // Fallback para dimensões: calcula bounding box através dos vértices de 3D/*.model se necessário
    if (dimensionsX === undefined || dimensionsY === undefined) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;
      let hasVertices = false;

      for (const entry of entries) {
        const entryPath = entry.entryName.replace(/\\/g, "/");
        if (entryPath.startsWith("3D/") && entryPath.endsWith(".model")) {
          try {
            const content = entry.getData().toString("utf8");
            const regex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
            let match;
            while ((match = regex.exec(content)) !== null) {
              hasVertices = true;
              const x = parseFloat(match[1]);
              const y = parseFloat(match[2]);
              const z = parseFloat(match[3]);
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              if (z < minZ) minZ = z;
              if (z > maxZ) maxZ = z;
            }
          } catch {}
        }
      }

      if (hasVertices && isFinite(minX) && isFinite(maxX)) {
        const diffX = Math.round(Math.abs(maxX - minX));
        const diffY = Math.round(Math.abs(maxY - minY));
        const diffZ = Math.round(Math.abs(maxZ - minZ));
        if (diffX > 0 && diffY > 0) {
          dimensionsX = diffX;
          dimensionsY = diffY;
          if (diffZ > 0) dimensionsZ = diffZ;
        }
      }
    }

    // 5. Fallback para 3D/3dmodel.model (ProfileTitle e capas de designer)
    const modelEntry = entries.find((e) =>
      e.entryName.replace(/\\/g, "/").toLowerCase() === "3d/3dmodel.model"
    );
    if (modelEntry) {
      try {
        const xml = modelEntry.getData().toString("utf8");
        if (layerHeight === undefined || infillDensity === undefined) {
          const profileMatch = xml.match(/<metadata name="ProfileTitle">([^<]+)<\/metadata>/i);
          if (profileMatch) {
            const title = profileMatch[1];
            if (layerHeight === undefined) {
              const lhMatch = title.match(/([0-9.]+)mm\s*layer/i);
              if (lhMatch) {
                const parsedLh = parseFloat(lhMatch[1]);
                if (!isNaN(parsedLh) && parsedLh > 0) layerHeight = parsedLh;
              }
            }
            if (infillDensity === undefined) {
              const infillMatch = title.match(/(\d+)%\s*infill/i);
              if (infillMatch) {
                const parsedInfill = parseInt(infillMatch[1], 10);
                if (!isNaN(parsedInfill) && parsedInfill >= 0) infillDensity = parsedInfill;
              }
            }
          }
        }
      } catch {}
    }

    // 6. Fallback legado para slice_info.config (chave = valor)
    if (!filamentType || !layerHeight) {
      const sliceInfoEntry = entries.find((e) =>
        e.entryName.replace(/\\/g, "/").toLowerCase().includes("slice_info.config")
      );
      if (sliceInfoEntry) {
        try {
          const configText = sliceInfoEntry.getData().toString("utf8");
          if (!filamentType) {
            const filamentMatch = configText.match(/filament(?:_type)?\s*=\s*([^\r\n]+)/i);
            if (filamentMatch) filamentType = filamentMatch[1].trim();
          }
          if (!layerHeight) {
            const layerMatch = configText.match(/layer_height\s*=\s*([0-9.]+)/i);
            if (layerMatch) layerHeight = parseFloat(layerMatch[1]);
          }
        } catch {}
      }
    }

    return {
      thumbnailPath,
      filamentType,
      layerHeight,
      nozzleSize,
      infillDensity,
      triangleCount,
      dimensionsX,
      dimensionsY,
      dimensionsZ,
    };
  } catch (err) {
    console.warn(`Aviso ao inspecionar .3mf: ${filePath}`, err);
    return {};
  }
}
