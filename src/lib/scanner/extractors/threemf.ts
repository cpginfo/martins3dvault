import fs from "fs";
import path from "path";
import crypto from "crypto";
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

/**
 * Localiza a miniatura oficial de um arquivo .3mf seguindo o padrão oficial do Windows Explorer / OPC
 * (Open Packaging Conventions - ISO/IEC 29500-2) e metadados de projeto (Bambu Studio, OrcaSlicer, PrusaSlicer, Cura).
 */
export function findThreeMfThumbnailEntry(entries: AdmZip.IZipEntry[]): AdmZip.IZipEntry | undefined {
  const entryMap = new Map<string, AdmZip.IZipEntry>();
  for (const entry of entries) {
    entryMap.set(entry.entryName.replace(/\\/g, "/").toLowerCase(), entry);
  }

  // 1. Padrão Oficial Windows Explorer / OPC (_rels/.rels)
  // O Windows Explorer lê o arquivo de relações do pacote OPC e busca por relacionamentos do tipo "metadata/thumbnail"
  const relsEntry = entries.find(
    (e) => e.entryName.replace(/\\/g, "/").toLowerCase() === "_rels/.rels"
  );
  if (relsEntry) {
    try {
      const xml = relsEntry.getData().toString("utf8");
      const relRegex = /<Relationship\s+([^>]*?)\/?>/gi;
      let m: RegExpExecArray | null;
      let opcTarget: string | null = null;

      while ((m = relRegex.exec(xml)) !== null) {
        const attrs = m[1];
        const typeMatch = attrs.match(/Type=["']([^"']+)["']/i);
        const targetMatch = attrs.match(/Target=["']([^"']+)["']/i);

        if (typeMatch && targetMatch) {
          const type = typeMatch[1];
          // Padrão OPC ISO/IEC 29500-2 e especificações 3MF
          if (/relationships\/(metadata\/)?thumbnail/i.test(type)) {
            opcTarget = targetMatch[1];
            break;
          }
        }
      }

      if (opcTarget) {
        const normTarget = opcTarget.replace(/\\/g, "/").replace(/^\//, "");

        // No Bambu Studio / OrcaSlicer, o thumbnail_3mf.png (240x240) é acompanhado
        // de thumbnail_middle.png (680x680) na pasta .thumbnails/. Se existir, usamos a versão de maior fidelidade.
        const middleCandidate = normTarget.replace(
          /thumbnail_(3mf|small)\.(png|jpg|jpeg|webp)$/i,
          "thumbnail_middle.$2"
        );
        if (entryMap.has(middleCandidate.toLowerCase())) {
          return entryMap.get(middleCandidate.toLowerCase());
        }

        if (entryMap.has(normTarget.toLowerCase())) {
          return entryMap.get(normTarget.toLowerCase());
        }
      }
    } catch {
      // Ignora falha de parse do _rels/.rels e segue para os próximos métodos
    }
  }

  // 2. Relacionamentos de modelo (3D/_rels/3dmodel.model.rels)
  const modelRelsEntry = entries.find(
    (e) => e.entryName.replace(/\\/g, "/").toLowerCase() === "3d/_rels/3dmodel.model.rels"
  );
  if (modelRelsEntry) {
    try {
      const xml = modelRelsEntry.getData().toString("utf8");
      const relRegex = /<Relationship\s+([^>]*?)\/?>/gi;
      let m: RegExpExecArray | null;

      while ((m = relRegex.exec(xml)) !== null) {
        const attrs = m[1];
        const typeMatch = attrs.match(/Type=["']([^"']+)["']/i);
        const targetMatch = attrs.match(/Target=["']([^"']+)["']/i);

        if (typeMatch && targetMatch && /relationships\/(metadata\/)?thumbnail/i.test(typeMatch[1])) {
          const t = targetMatch[1].replace(/\\/g, "/");
          const normTarget = t.startsWith("/") ? t.substring(1) : path.posix.join("3d", t);
          if (entryMap.has(normTarget.toLowerCase())) {
            return entryMap.get(normTarget.toLowerCase());
          }
        }
      }
    } catch {}
  }

  // 3. Metadados do Designer (DesignerCover ou ProfileCover em 3D/3dmodel.model)
  const modelEntry = entries.find(
    (e) => e.entryName.replace(/\\/g, "/").toLowerCase() === "3d/3dmodel.model"
  );
  if (modelEntry) {
    try {
      const xml = modelEntry.getData().toString("utf8");
      const coverMatch = xml.match(
        /<metadata\s+name=["'](DesignerCover|ProfileCover)["']>([^<]+)<\/metadata>/i
      );
      if (coverMatch) {
        const coverFileName = coverMatch[2].trim();
        const candidates = [
          `auxiliaries/model pictures/${coverFileName}`.toLowerCase(),
          `auxiliaries/${coverFileName}`.toLowerCase(),
          `metadata/${coverFileName}`.toLowerCase(),
        ];
        for (const cand of candidates) {
          if (entryMap.has(cand)) {
            return entryMap.get(cand);
          }
        }
      }
    } catch {}
  }

  // 4. Fallback Prioritário por nomes e pastas dedicadas a capas reais/fotos
  const preferredPatterns = [
    /^auxiliaries\/\.thumbnails\/thumbnail_middle\.(png|jpg|jpeg|webp)$/i,
    /^auxiliaries\/\.thumbnails\/thumbnail_3mf\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/project_cover\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/cover\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/thumbnail\.(png|jpg|jpeg|webp)$/i,
    /^thumbnail\.(png|jpg|jpeg|webp)$/i,
    /^auxiliaries\/model pictures\/.*\.(png|jpg|jpeg|webp)$/i,
    /^auxiliaries\/.*cover.*\.(png|jpg|jpeg|webp)$/i,
    /^auxiliaries\/.*thumbnail.*\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/.*cover.*\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/.*thumbnail.*\.(png|jpg|jpeg|webp)$/i,
  ];

  for (const pattern of preferredPatterns) {
    for (const [key, entry] of entryMap.entries()) {
      if (pattern.test(key)) {
        return entry;
      }
    }
  }

  // 5. Último recurso absoluto: renders automáticos da placa de fatiamento (Plate 1)
  const platePatterns = [
    /^metadata\/plate_1\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/plate_\d+\.(png|jpg|jpeg|webp)$/i,
    /^metadata\/slice_info\.(png|jpg|jpeg|webp)$/i,
  ];

  for (const pattern of platePatterns) {
    for (const [key, entry] of entryMap.entries()) {
      if (pattern.test(key)) {
        return entry;
      }
    }
  }

  return undefined;
}

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

    // 1. Procura por thumbnail seguindo o padrão oficial do Windows Explorer / OPC
    const thumbEntry = findThreeMfThumbnailEntry(entries);
    if (thumbEntry) {
      const ext = path.extname(thumbEntry.entryName) || ".png";
      const thumbDir = path.join(storageDataPath, "thumbnails");
      await fs.promises.mkdir(thumbDir, { recursive: true });

      const fileName = `${modelId}_thumb${ext}`;
      const fullDestPath = path.join(thumbDir, fileName);

      const buffer = thumbEntry.getData();
      if (buffer && buffer.length > 0) {
        await fs.promises.writeFile(fullDestPath, buffer);
        const hash = crypto.createHash("md5").update(buffer).digest("hex").slice(0, 8);
        thumbnailPath = `/api/assets/thumbnails/${fileName}?v=${hash}`;
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
