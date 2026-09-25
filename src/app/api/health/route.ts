import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { APP_VERSION } from "@/lib/version";
import { getConcurrencyStats } from "@/lib/security/concurrency-limiter";
import { checkStorageHealth } from "@/lib/storage/health";

export async function GET() {
  const errors: string[] = [];
  let dbStatus = "connected";

  // 1. Validação de conectividade com o banco de dados
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (dbErr: any) {
    dbStatus = "error";
    errors.push(`Banco de dados inacessível: ${dbErr.message}`);
  }

  // 2. Validação de montagem e integridade do storage (STORAGE_DATA_PATH, STORAGE_LIBRARIES_PATH e bibliotecas)
  let activeLibraries: Array<{ id: string; name: string; path: string }> = [];
  if (dbStatus === "connected") {
    try {
      activeLibraries = await prisma.library.findMany({
        where: { enabled: true },
        select: { id: true, name: true, path: true },
      });
    } catch {
      // Se falhar a listagem de bibliotecas, o erro no banco já foi ou será capturado
    }
  }

  const storageHealth = await checkStorageHealth(activeLibraries, 2000);
  if (!storageHealth.healthy) {
    errors.push(...storageHealth.errors);
  }

  const isHealthy = errors.length === 0;

  const payload = {
    status: isHealthy ? "healthy" : "unhealthy",
    version: APP_VERSION,
    uptime: process.uptime(),
    database: dbStatus,
    storage: {
      status: storageHealth.healthy ? "healthy" : "unhealthy",
      dataPath: {
        path: storageHealth.dataPath.path,
        configured: storageHealth.dataPath.configuredPath,
        exists: storageHealth.dataPath.exists,
        readable: storageHealth.dataPath.readable,
        writable: storageHealth.dataPath.writable,
        error: storageHealth.dataPath.error,
      },
      librariesPath: {
        path: storageHealth.librariesPath.path,
        configured: storageHealth.librariesPath.configuredPath,
        exists: storageHealth.librariesPath.exists,
        readable: storageHealth.librariesPath.readable,
        error: storageHealth.librariesPath.error,
      },
      activeLibrariesChecked: storageHealth.libraries.length,
      libraries: storageHealth.libraries,
    },
    concurrency: getConcurrencyStats(),
    errors: errors.length > 0 ? errors : undefined,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, { status: isHealthy ? 200 : 503 });
}
