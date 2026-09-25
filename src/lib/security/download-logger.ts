export interface DownloadLogEntry {
  id: string;
  userId: string;
  userEmail?: string;
  fileId?: string;
  filePath?: string;
  timestamp: string;
  result: "SUCCESS" | "RATE_LIMITED_429" | "BLOCKED_CIRCUIT_BREAKER" | "ERROR";
  statusCode: number;
  message?: string;
}

// Histórico circular em memória dos últimos 100 eventos de download para observabilidade
const MAX_LOG_HISTORY = 100;
const logHistory: DownloadLogEntry[] = [];

/**
 * Registra evento de download/conversão em formato estruturado
 */
export function logDownloadEvent(entry: Omit<DownloadLogEntry, "id" | "timestamp">): DownloadLogEntry {
  const fullEntry: DownloadLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  // Mantém no histórico em memória
  logHistory.unshift(fullEntry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.pop();
  }

  // Log estruturado no console / stdout para agregadores de logs (ex: Docker, Grafana, Loki)
  const logPrefix = fullEntry.result === "SUCCESS" ? "📥 [DOWNLOAD]" : "⚠️ [DOWNLOAD_BLOCKED]";
  console.log(
    `${logPrefix} ${JSON.stringify({
      timestamp: fullEntry.timestamp,
      userId: fullEntry.userId,
      userEmail: fullEntry.userEmail,
      file: fullEntry.filePath || fullEntry.fileId,
      result: fullEntry.result,
      status: fullEntry.statusCode,
      reason: fullEntry.message,
    })}`
  );

  return fullEntry;
}

/**
 * Retorna os registros recentes de download para o painel de métricas/saúde
 */
export function getRecentDownloadLogs(limit = 50): DownloadLogEntry[] {
  return logHistory.slice(0, limit);
}
