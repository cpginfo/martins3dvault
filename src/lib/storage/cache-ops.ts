import fs from "fs";
import path from "path";

/**
 * Retorna o caminho absoluto da pasta de cache do sistema,
 * com fallback inteligente para ambientes Docker e host local.
 */
export function getCacheDirectory(): string {
  const configured = process.env.STORAGE_DATA_PATH || "/data";
  const configuredCache = path.join(configured, "cache");

  if (fs.existsSync(configuredCache)) {
    return configuredCache;
  }

  const hostCache = path.resolve(process.cwd(), "data", "cache");
  return hostCache;
}

export interface CacheStats {
  sizeBytes: number;
  fileCount: number;
  files: Array<{
    name: string;
    sizeBytes: number;
    modifiedAt: string;
  }>;
}

/**
 * Calcula o tamanho total e quantidade de arquivos armazenados no cache de malhas 3D.
 */
export async function getCacheStats(): Promise<CacheStats> {
  const cacheDir = getCacheDirectory();

  if (!fs.existsSync(cacheDir)) {
    return { sizeBytes: 0, fileCount: 0, files: [] };
  }

  try {
    const entries = await fs.promises.readdir(cacheDir, { withFileTypes: true });
    let totalSize = 0;
    const filesList: Array<{ name: string; sizeBytes: number; modifiedAt: string }> = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(cacheDir, entry.name);
      try {
        const stat = await fs.promises.stat(fullPath);
        totalSize += stat.size;
        filesList.push({
          name: entry.name,
          sizeBytes: stat.size,
          modifiedAt: stat.mtime.toISOString(),
        });
      } catch {
        // Ignora arquivos excluídos concorrentemente
      }
    }

    // Ordena do mais recente para o mais antigo
    filesList.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());

    return {
      sizeBytes: totalSize,
      fileCount: filesList.length,
      files: filesList,
    };
  } catch (err) {
    console.error("Erro ao calcular métricas do cache:", err);
    return { sizeBytes: 0, fileCount: 0, files: [] };
  }
}

/**
 * Remove todos os arquivos da pasta de cache de malhas 3D,
 * liberando espaço em disco sem afetar dados do acervo.
 */
export async function clearCache(): Promise<{
  success: boolean;
  freedBytes: number;
  deletedFiles: number;
}> {
  const cacheDir = getCacheDirectory();

  if (!fs.existsSync(cacheDir)) {
    return { success: true, freedBytes: 0, deletedFiles: 0 };
  }

  let freedBytes = 0;
  let deletedFiles = 0;

  try {
    const entries = await fs.promises.readdir(cacheDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(cacheDir, entry.name);
      try {
        const stat = await fs.promises.stat(fullPath);
        await fs.promises.unlink(fullPath);
        freedBytes += stat.size;
        deletedFiles++;
      } catch (err) {
        console.warn(`Aviso ao excluir arquivo de cache ${entry.name}:`, err);
      }
    }

    return {
      success: true,
      freedBytes,
      deletedFiles,
    };
  } catch (err: any) {
    console.error("Erro ao limpar cache de malhas 3D:", err);
    throw new Error(`Falha ao limpar cache: ${err.message}`);
  }
}
