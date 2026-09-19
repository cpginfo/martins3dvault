import fs from "fs";

export interface StlMetadata {
  triangleCount: number;
  dimensionsX: number; // mm
  dimensionsY: number; // mm
  dimensionsZ: number; // mm
}

/**
 * Analisa arquivos STL (binários ou ASCII) para extrair dimensões reais e contagem de triângulos
 */
export async function parseStlFile(filePath: string): Promise<StlMetadata | null> {
  try {
    const buffer = await fs.promises.readFile(filePath);
    if (buffer.length < 84) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    let triangleCount = 0;

    // Checa se é binário comparando o tamanho esperado: 84 + (triangleCount * 50)
    const expectedTriangles = buffer.readUInt32LE(80);
    const isBinary = buffer.length === 84 + expectedTriangles * 50;

    if (isBinary && expectedTriangles > 0) {
      triangleCount = expectedTriangles;
      // Para modelos gigantes, podemos fazer amostragem de vértices para calcular bounding box ultra-rápido
      const step = triangleCount > 500000 ? Math.ceil(triangleCount / 200000) : 1;

      for (let i = 0; i < triangleCount; i += step) {
        const offset = 84 + i * 50;
        // Pula o vetor normal (12 bytes) e lê os 3 vértices (3 * 12 bytes = 36 bytes)
        for (let v = 0; v < 3; v++) {
          const vOffset = offset + 12 + v * 12;
          const x = buffer.readFloatLE(vOffset);
          const y = buffer.readFloatLE(vOffset + 4);
          const z = buffer.readFloatLE(vOffset + 8);

          if (!isNaN(x) && isFinite(x)) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
          if (!isNaN(y) && isFinite(y)) {
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
          if (!isNaN(z) && isFinite(z)) {
            if (z < minZ) minZ = z;
            if (z > maxZ) maxZ = z;
          }
        }
      }
    } else {
      // Parser ASCII
      const text = buffer.toString("utf8");
      const vertexRegex = /vertex\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/g;
      let match;
      let vertexCount = 0;

      while ((match = vertexRegex.exec(text)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const z = parseFloat(match[3]);

        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;

        vertexCount++;
      }
      triangleCount = Math.floor(vertexCount / 3);
    }

    if (triangleCount === 0 || minX === Infinity) {
      return { triangleCount: 0, dimensionsX: 0, dimensionsY: 0, dimensionsZ: 0 };
    }

    const round = (num: number) => Math.round(num * 100) / 100;

    return {
      triangleCount,
      dimensionsX: round(Math.max(0, maxX - minX)),
      dimensionsY: round(Math.max(0, maxY - minY)),
      dimensionsZ: round(Math.max(0, maxZ - minZ)),
    };
  } catch (err) {
    console.error(`Erro ao analisar STL: ${filePath}`, err);
    return null;
  }
}
