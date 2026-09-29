import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { scanLibrary } from "./crawler";

/**
 * Executa uma varredura diferencial automática em todas as bibliotecas ativas
 * quando a aplicação/contêiner é iniciado ou reiniciado.
 *
 * - Não bloqueia a inicialização do servidor HTTP nem os healthchecks do Docker.
 * - É estritamente diferencial: processa apenas arquivos novos, alterados ou
 *   com metadados pendentes de extração (.3mf).
 * - Restaura status de bibliotecas que possam ter ficado em 'SCANNING' por reinicialização abrupta.
 */
export async function runStartupLibraryScan(): Promise<void> {
  if (process.env.STARTUP_SCAN_ENABLED === "false") {
    console.log("[Startup Scan] ⏸️ Varredura automática desativada (STARTUP_SCAN_ENABLED=false).");
    return;
  }

  console.log("[Startup Scan] 🔍 Verificando bibliotecas para sincronização de inicialização...");

  try {
    // 1. Limpa eventuais status 'SCANNING' presos por reinicialização do container
    const staleResult = await prisma.library.updateMany({
      where: { scanStatus: "SCANNING" },
      data: { scanStatus: "IDLE" },
    });
    if (staleResult.count > 0) {
      console.log(`[Startup Scan] 🧹 Resetados ${staleResult.count} status de varredura pendentes de sessões anteriores.`);
    }

    // 2. Busca todas as bibliotecas ativas
    const libraries = await prisma.library.findMany({
      where: { enabled: true },
      orderBy: { createdAt: "asc" },
    });

    if (libraries.length === 0) {
      console.log("[Startup Scan] ℹ️ Nenhuma biblioteca habilitada para sincronização.");
      return;
    }

    console.log(`[Startup Scan] 🔄 Iniciando varredura diferencial em ${libraries.length} biblioteca(s)...`);

    // 3. Executa varredura diferencial em cada biblioteca sequencialmente
    for (const lib of libraries) {
      const resolvedPath = path.resolve(lib.path);
      if (!fs.existsSync(resolvedPath)) {
        console.warn(`[Startup Scan] ⚠️ Diretório da biblioteca '${lib.name}' não acessível em '${resolvedPath}'. Pulando.`);
        continue;
      }

      console.log(`[Startup Scan] 📂 Varrendo biblioteca '${lib.name}' (${resolvedPath})...`);
      try {
        const stats = await scanLibrary(lib.id, { trigger: "STARTUP" });
        console.log(
          `[Startup Scan] ✅ '${lib.name}' concluída: ` +
          `+${stats.addedModels} novos, ~${stats.updatedModels} atualizados, ` +
          `=${stats.unchangedModels} inalterados, -${stats.deletedModels} removidos ` +
          `(${stats.errors.length} erro(s)).`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[Startup Scan] ❌ Erro durante varredura de '${lib.name}':`, msg);
      }
    }

    console.log("[Startup Scan] ✨ Varredura diferencial de inicialização concluída.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Startup Scan] ❌ Falha crítica ao executar varredura de inicialização:", msg);
  }
}
