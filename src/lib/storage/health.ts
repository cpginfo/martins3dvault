import fs from "fs";
import path from "path";

export interface StoragePathStatus {
  path: string;
  configuredPath: string;
  exists: boolean;
  readable: boolean;
  writable?: boolean;
  isStaleOrTimeout: boolean;
  error?: string;
}

export interface StorageHealthResult {
  healthy: boolean;
  dataPath: StoragePathStatus;
  librariesPath: StoragePathStatus;
  libraries: Array<{
    id: string;
    name: string;
    path: string;
    accessible: boolean;
    error?: string;
  }>;
  errors: string[];
}

/**
 * Valida o acesso ao sistema de arquivos com timeout de segurança
 * para evitar bloqueios de thread (D-State) em caso de desconexão de NFS ou CIFS/SMB.
 */
async function probePath(
  dirPath: string,
  checkWritable: boolean = false,
  timeoutMs: number = 2000
): Promise<{ exists: boolean; readable: boolean; writable?: boolean; isTimeout: boolean; error?: string }> {
  const probePromise = (async () => {
    try {
      if (!fs.existsSync(dirPath)) {
        return { exists: false, readable: false, writable: false, isTimeout: false, error: "Diretório não encontrado no host" };
      }

      // Validação de leitura
      await fs.promises.access(dirPath, fs.constants.R_OK);

      // Stat rápido para assegurar que a montagem responde a inodes
      await fs.promises.stat(dirPath);

      // Validação de escrita se solicitada (cria e remove arquivo temporário de teste)
      let writable = true;
      if (checkWritable) {
        const testFile = path.join(dirPath, `.health_probe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
        try {
          await fs.promises.writeFile(testFile, "probe");
          await fs.promises.unlink(testFile);
        } catch (writeErr: any) {
          writable = false;
          return {
            exists: true,
            readable: true,
            writable: false,
            isTimeout: false,
            error: `Sem permissão de escrita em ${dirPath}: ${writeErr.message}`,
          };
        }
      }

      return { exists: true, readable: true, writable, isTimeout: false };
    } catch (err: any) {
      return {
        exists: false,
        readable: false,
        writable: false,
        isTimeout: false,
        error: err.message,
      };
    }
  })();

  const timeoutPromise = new Promise<{
    exists: boolean;
    readable: boolean;
    writable?: boolean;
    isTimeout: boolean;
    error?: string;
  }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          exists: false,
          readable: false,
          writable: false,
          isTimeout: true,
          error: `Timeout de I/O (${timeoutMs}ms) ao acessar ${dirPath}. Possível queda de montagem NAS (NFS/CIFS).`,
        }),
      timeoutMs
    )
  );

  return Promise.race([probePromise, timeoutPromise]);
}

/**
 * Executa checagem profunda de saúde do armazenamento local e dos pontos de montagem de rede.
 */
export async function checkStorageHealth(
  activeLibraries: Array<{ id: string; name: string; path: string }> = [],
  timeoutMs: number = 2000
): Promise<StorageHealthResult> {
  const configuredDataPath = process.env.STORAGE_DATA_PATH || "./data";
  const configuredLibrariesPath = process.env.STORAGE_LIBRARIES_PATH || "./libraries";

  const resolvedDataPath = path.resolve(configuredDataPath);
  const resolvedLibrariesPath = path.resolve(configuredLibrariesPath);

  const errors: string[] = [];

  // 1. Checa STORAGE_DATA_PATH (deve ser legível e gravável para cache, thumbnails e uploads)
  const dataProbe = await probePath(resolvedDataPath, true, timeoutMs);
  const dataPathStatus: StoragePathStatus = {
    path: resolvedDataPath,
    configuredPath: configuredDataPath,
    exists: dataProbe.exists,
    readable: dataProbe.readable,
    writable: dataProbe.writable,
    isStaleOrTimeout: dataProbe.isTimeout,
    error: dataProbe.error,
  };
  if (!dataProbe.readable || !dataProbe.writable) {
    errors.push(`STORAGE_DATA_PATH (${configuredDataPath}): ${dataProbe.error || "Inacessível ou sem permissão de escrita"}`);
  }

  // 2. Checa STORAGE_LIBRARIES_PATH (deve existir e ser legível)
  const libProbe = await probePath(resolvedLibrariesPath, false, timeoutMs);
  const librariesPathStatus: StoragePathStatus = {
    path: resolvedLibrariesPath,
    configuredPath: configuredLibrariesPath,
    exists: libProbe.exists,
    readable: libProbe.readable,
    isStaleOrTimeout: libProbe.isTimeout,
    error: libProbe.error,
  };
  if (!libProbe.readable) {
    errors.push(`STORAGE_LIBRARIES_PATH (${configuredLibrariesPath}): ${libProbe.error || "Inacessível ou sem permissão de leitura"}`);
  }

  // 3. Checa cada biblioteca ativa registrada no banco de dados
  const libraryStatuses: StorageHealthResult["libraries"] = [];
  for (const lib of activeLibraries) {
    const resolvedLibPath = path.resolve(lib.path);
    const probe = await probePath(resolvedLibPath, false, timeoutMs);
    libraryStatuses.push({
      id: lib.id,
      name: lib.name,
      path: lib.path,
      accessible: probe.readable,
      error: probe.error,
    });

    if (!probe.readable) {
      errors.push(`Biblioteca '${lib.name}' em '${lib.path}': ${probe.error || "Ponto de montagem inacessível"}`);
    }
  }

  return {
    healthy: errors.length === 0,
    dataPath: dataPathStatus,
    librariesPath: librariesPathStatus,
    libraries: libraryStatuses,
    errors,
  };
}
