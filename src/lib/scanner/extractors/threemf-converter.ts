import AdmZip from "adm-zip";
import fs from "fs";
import path from "path";

function parseTransform(str: string | null): number[] | null {
  if (!str) return null;
  const parts = str.trim().split(/\s+/).map(Number);
  return parts.length === 12 ? parts : null;
}

function multiplyTransforms(parent: number[] | null, child: number[] | null): number[] | null {
  if (!parent) return child;
  if (!child) return parent;

  const [a00, a01, a02, a10, a11, a12, a20, a21, a22, atx, aty, atz] = parent;
  const [b00, b01, b02, b10, b11, b12, b20, b21, b22, btx, bty, btz] = child;

  return [
    a00 * b00 + a01 * b10 + a02 * b20,
    a00 * b01 + a01 * b11 + a02 * b21,
    a00 * b02 + a01 * b12 + a02 * b22,

    a10 * b00 + a11 * b10 + a12 * b20,
    a10 * b01 + a11 * b11 + a12 * b21,
    a10 * b02 + a11 * b12 + a12 * b22,

    a20 * b00 + a21 * b10 + a22 * b20,
    a20 * b01 + a21 * b11 + a22 * b21,
    a20 * b02 + a21 * b12 + a22 * b22,

    a00 * btx + a01 * bty + a02 * btz + atx,
    a10 * btx + a11 * bty + a12 * btz + aty,
    a20 * btx + a21 * bty + a22 * btz + atz,
  ];
}

interface MeshData {
  vertices: [number, number, number][];
  triangles: [number, number, number][];
}

interface ComponentRef {
  objectId: string;
  targetPath: string;
  transform: number[] | null;
}

/**
 * Converte um arquivo .3mf complexo (Bambu Studio, Prusa, Cura) para STL Binário otimizado
 * Permite carregamento instantâneo no Three.js sem travar a thread de JavaScript com DOMParser
 */
export async function convert3mfToBinaryStl(filePath: string): Promise<Buffer> {
  const zip = new AdmZip(filePath);

  const modelEntries = zip
    .getEntries()
    .filter(
      (e) =>
        e.entryName.toLowerCase().endsWith(".model") &&
        !e.entryName.toLowerCase().endsWith(".rels")
    );

  const meshMap = new Map<string, MeshData>();
  const compMap = new Map<string, ComponentRef[]>();

  let rootXml = "";

  for (const entry of modelEntries) {
    const normPath = "/" + entry.entryName.replace(/\\/g, "/").replace(/^\//, "").toLowerCase();
    const xml = entry.getData().toString("utf8");

    if (normPath.includes("3dmodel.model")) {
      rootXml = xml;
    }

    const objRegex = /<object\s+([^>]*id="(\d+)"[^>]*)>([\s\S]*?)<\/object>/g;
    let objMatch;
    while ((objMatch = objRegex.exec(xml)) !== null) {
      const id = objMatch[2];
      const body = objMatch[3];
      const fullKey = `${normPath}::${id}`;

      if (body.includes("<mesh>")) {
        const vertices: [number, number, number][] = [];
        const vRegex = /<vertex\s+x="([^"]+)"\s+y="([^"]+)"\s+z="([^"]+)"/g;
        let vm;
        while ((vm = vRegex.exec(body)) !== null) {
          vertices.push([parseFloat(vm[1]), parseFloat(vm[2]), parseFloat(vm[3])]);
        }

        const triangles: [number, number, number][] = [];
        const tRegex = /<triangle\s+v1="([^"]+)"\s+v2="([^"]+)"\s+v3="([^"]+)"/g;
        let tm;
        while ((tm = tRegex.exec(body)) !== null) {
          triangles.push([parseInt(tm[1], 10), parseInt(tm[2], 10), parseInt(tm[3], 10)]);
        }

        meshMap.set(fullKey, { vertices, triangles });
        meshMap.set(id, { vertices, triangles });
      } else if (body.includes("<components>")) {
        const components: ComponentRef[] = [];
        const cRegex = /<component\s+([^>]*)\/>/g;
        let cm;
        while ((cm = cRegex.exec(body)) !== null) {
          const cAttr = cm[1];
          const oidMatch = cAttr.match(/objectid="(\d+)"/i);
          const pathMatch = cAttr.match(/(?:p:)?path="([^"]+)"/i);
          const transMatch = cAttr.match(/transform="([^"]+)"/i);
          if (oidMatch) {
            components.push({
              objectId: oidMatch[1],
              targetPath: pathMatch
                ? "/" + pathMatch[1].replace(/\\/g, "/").replace(/^\//, "").toLowerCase()
                : normPath,
              transform: parseTransform(transMatch ? transMatch[1] : null),
            });
          }
        }
        compMap.set(fullKey, components);
        compMap.set(id, components);
      }
    }
  }

  // Identifica itens do build
  const flatMeshesToRender: { mesh: MeshData; transform: number[] | null }[] = [];

  function expandObject(
    targetPath: string,
    objectId: string,
    currentTransform: number[] | null,
    depth = 0
  ) {
    if (depth > 8) return;

    const fullKey = `${targetPath}::${objectId}`;
    const mesh = meshMap.get(fullKey) || meshMap.get(objectId);
    if (mesh) {
      flatMeshesToRender.push({ mesh, transform: currentTransform });
      return;
    }

    const components = compMap.get(fullKey) || compMap.get(objectId);
    if (components) {
      for (const comp of components) {
        const nextTransform = multiplyTransforms(currentTransform, comp.transform);
        expandObject(comp.targetPath, comp.objectId, nextTransform, depth + 1);
      }
    }
  }

  const itemRegex = /<item\s+[^>]*objectid="(\d+)"(?:[^>]*transform="([^"]+)")?[^>]*\/>/gi;
  let itemMatch;
  let hasBuildItems = false;

  while ((itemMatch = itemRegex.exec(rootXml)) !== null) {
    hasBuildItems = true;
    const objectId = itemMatch[1];
    const transform = parseTransform(itemMatch[2]);
    expandObject("/3d/3dmodel.model", objectId, transform);
  }

  // Se não houver nós <item> no build, adiciona todas as malhas descobertas
  if (!hasBuildItems || flatMeshesToRender.length === 0) {
    const renderedIds = new Set<string>();
    for (const [key, mesh] of meshMap.entries()) {
      if (key.includes("::")) {
        flatMeshesToRender.push({ mesh, transform: null });
      } else if (!meshMap.has(`/3d/3dmodel.model::${key}`) && !renderedIds.has(key)) {
        flatMeshesToRender.push({ mesh, transform: null });
        renderedIds.add(key);
      }
    }
  }

  // Calcula total de triângulos
  let totalTriangles = 0;
  for (const item of flatMeshesToRender) {
    totalTriangles += item.mesh.triangles.length;
  }

  // Aloca buffer binário STL (80 bytes cabeçalho + 4 bytes contagem + 50 bytes por triângulo)
  const bufferSize = 84 + totalTriangles * 50;
  const buffer = Buffer.alloc(bufferSize);
  buffer.write("Martins3DVault Fast Mesh Exporter - Optimized Binary STL", 0, 80, "ascii");
  buffer.writeUInt32LE(totalTriangles, 80);

  let offset = 84;

  for (const { mesh, transform } of flatMeshesToRender) {
    const { vertices, triangles } = mesh;
    const m = transform;

    for (let i = 0; i < triangles.length; i++) {
      const t = triangles[i];
      const p1 = vertices[t[0]];
      const p2 = vertices[t[1]];
      const p3 = vertices[t[2]];
      if (!p1 || !p2 || !p3) continue;

      let x1 = p1[0], y1 = p1[1], z1 = p1[2];
      let x2 = p2[0], y2 = p2[1], z2 = p2[2];
      let x3 = p3[0], y3 = p3[1], z3 = p3[2];

      if (m) {
        x1 = m[0] * p1[0] + m[1] * p1[1] + m[2] * p1[2] + m[9];
        y1 = m[3] * p1[0] + m[4] * p1[1] + m[5] * p1[2] + m[10];
        z1 = m[6] * p1[0] + m[7] * p1[1] + m[8] * p1[2] + m[11];

        x2 = m[0] * p2[0] + m[1] * p2[1] + m[2] * p2[2] + m[9];
        y2 = m[3] * p2[0] + m[4] * p2[1] + m[5] * p2[2] + m[10];
        z2 = m[6] * p2[0] + m[7] * p2[1] + m[8] * p2[2] + m[11];

        x3 = m[0] * p3[0] + m[1] * p3[1] + m[2] * p3[2] + m[9];
        y3 = m[3] * p3[0] + m[4] * p3[1] + m[5] * p3[2] + m[10];
        z3 = m[6] * p3[0] + m[7] * p3[1] + m[8] * p3[2] + m[11];
      }

      // Normal (pode ser 0, o Three.js calcula vertex normals na geometria)
      buffer.writeFloatLE(0, offset);
      buffer.writeFloatLE(0, offset + 4);
      buffer.writeFloatLE(0, offset + 8);

      // V1
      buffer.writeFloatLE(x1, offset + 12);
      buffer.writeFloatLE(y1, offset + 16);
      buffer.writeFloatLE(z1, offset + 20);

      // V2
      buffer.writeFloatLE(x2, offset + 24);
      buffer.writeFloatLE(y2, offset + 28);
      buffer.writeFloatLE(z2, offset + 32);

      // V3
      buffer.writeFloatLE(x3, offset + 36);
      buffer.writeFloatLE(y3, offset + 40);
      buffer.writeFloatLE(z3, offset + 44);

      // Attribute byte count
      buffer.writeUInt16LE(0, offset + 48);

      offset += 50;
    }
  }

  return buffer;
}
