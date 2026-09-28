/**
 * Hook nativo do Next.js (App Router) executado uma vez na inicialização do servidor.
 * Dispara a varredura diferencial automática de bibliotecas em segundo plano.
 */
export async function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    const { runStartupLibraryScan } = await import("@/lib/scanner/startup-scan");

    // Executa em segundo plano com delay para permitir que o servidor HTTP vincule a porta
    // e os healthchecks do contêiner passem imediatamente sem qualquer travamento.
    setTimeout(() => {
      runStartupLibraryScan().catch((err) => {
        console.error("[Startup Scan] Erro não tratado durante a varredura inicial:", err);
      });
    }, 2000);
  }
}
