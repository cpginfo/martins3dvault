import { ScanStats } from "./crawler";

export type ScanTrigger = "MANUAL" | "STARTUP";
export type ScanPhase =
  | "IDLE"
  | "INITIALIZING"
  | "DISCOVERING"
  | "PROCESSING"
  | "CLEANUP"
  | "COMPLETED"
  | "FAILED";

export interface ScanProgressState {
  isScanning: boolean;
  jobId: string | null;
  libraryId: string | null;
  libraryName: string | null;
  trigger: ScanTrigger | null;
  phase: ScanPhase;
  currentFolder: string;
  currentModel: string;
  processedFolders: number;
  totalFolders: number;
  processedModels: number;
  totalModels: number;
  addedCount: number;
  updatedCount: number;
  unchangedCount: number;
  deletedCount: number;
  percentage: number; // 0 a 100
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  errorMessage: string | null;
}

const initialProgressState: ScanProgressState = {
  isScanning: false,
  jobId: null,
  libraryId: null,
  libraryName: null,
  trigger: null,
  phase: "IDLE",
  currentFolder: "",
  currentModel: "",
  processedFolders: 0,
  totalFolders: 0,
  processedModels: 0,
  totalModels: 0,
  addedCount: 0,
  updatedCount: 0,
  unchangedCount: 0,
  deletedCount: 0,
  percentage: 0,
  startedAt: null,
  completedAt: null,
  durationMs: 0,
  errorMessage: null,
};

// Utiliza o globalThis para garantir persistência no runtime Node.js do Next.js
const globalForScan = globalThis as unknown as {
  scanProgressState?: ScanProgressState;
  scanClearTimer?: NodeJS.Timeout;
};

if (!globalForScan.scanProgressState) {
  globalForScan.scanProgressState = { ...initialProgressState };
}

export function getScanProgress(): ScanProgressState {
  return globalForScan.scanProgressState || { ...initialProgressState };
}

export function startScanProgress(
  jobId: string,
  libraryId: string,
  libraryName: string,
  trigger: ScanTrigger = "MANUAL"
): void {
  if (globalForScan.scanClearTimer) {
    clearTimeout(globalForScan.scanClearTimer);
    globalForScan.scanClearTimer = undefined;
  }

  globalForScan.scanProgressState = {
    isScanning: true,
    jobId,
    libraryId,
    libraryName,
    trigger,
    phase: "DISCOVERING",
    currentFolder: "Iniciando descoberta de pastas...",
    currentModel: "",
    processedFolders: 0,
    totalFolders: 0,
    processedModels: 0,
    totalModels: 0,
    addedCount: 0,
    updatedCount: 0,
    unchangedCount: 0,
    deletedCount: 0,
    percentage: 5,
    startedAt: new Date().toISOString(),
    completedAt: null,
    durationMs: 0,
    errorMessage: null,
  };
}

export function updateScanDiscovery(scannedFolders: number, currentFolder: string): void {
  if (!globalForScan.scanProgressState || !globalForScan.scanProgressState.isScanning) return;

  globalForScan.scanProgressState.phase = "DISCOVERING";
  globalForScan.scanProgressState.processedFolders = scannedFolders;
  globalForScan.scanProgressState.currentFolder = currentFolder;
  // Durante descoberta, avança proporcionalmente até no máx 20%
  const simulatedPercent = Math.min(20, 5 + Math.floor(scannedFolders / 5));
  globalForScan.scanProgressState.percentage = simulatedPercent;
}

export function setScanTargets(totalModels: number): void {
  if (!globalForScan.scanProgressState || !globalForScan.scanProgressState.isScanning) return;

  globalForScan.scanProgressState.phase = "PROCESSING";
  globalForScan.scanProgressState.totalModels = totalModels;
  globalForScan.scanProgressState.percentage = totalModels === 0 ? 95 : 20;
}

export function updateScanModelProgress(info: {
  processed: number;
  total: number;
  currentModel: string;
  added: number;
  updated: number;
  unchanged: number;
}): void {
  if (!globalForScan.scanProgressState || !globalForScan.scanProgressState.isScanning) return;

  const { processed, total, currentModel, added, updated, unchanged } = info;
  globalForScan.scanProgressState.phase = "PROCESSING";
  globalForScan.scanProgressState.processedModels = processed;
  globalForScan.scanProgressState.totalModels = total;
  globalForScan.scanProgressState.currentModel = currentModel;
  globalForScan.scanProgressState.addedCount = added;
  globalForScan.scanProgressState.updatedCount = updated;
  globalForScan.scanProgressState.unchangedCount = unchanged;

  if (total > 0) {
    const calcPercent = Math.min(95, Math.round(20 + (processed / total) * 75));
    globalForScan.scanProgressState.percentage = calcPercent;
  }
}

export function completeScanProgress(stats: ScanStats): void {
  if (!globalForScan.scanProgressState) return;

  const started = globalForScan.scanProgressState.startedAt
    ? new Date(globalForScan.scanProgressState.startedAt).getTime()
    : Date.now();
  const now = Date.now();

  globalForScan.scanProgressState = {
    ...globalForScan.scanProgressState,
    isScanning: false,
    phase: "COMPLETED",
    percentage: 100,
    processedFolders: stats.scannedFolders,
    addedCount: stats.addedModels,
    updatedCount: stats.updatedModels,
    unchangedCount: stats.unchangedModels,
    deletedCount: stats.deletedModels,
    completedAt: new Date(now).toISOString(),
    durationMs: now - started,
    currentFolder: "",
    currentModel: "",
  };

  // Mantém estado de sucesso visível por 20 segundos para o usuário ver antes de limpar
  globalForScan.scanClearTimer = setTimeout(() => {
    if (globalForScan.scanProgressState && !globalForScan.scanProgressState.isScanning) {
      globalForScan.scanProgressState.phase = "IDLE";
      globalForScan.scanProgressState.percentage = 0;
    }
  }, 20000);
}

export function failScanProgress(errorMsg: string): void {
  if (!globalForScan.scanProgressState) return;

  globalForScan.scanProgressState = {
    ...globalForScan.scanProgressState,
    isScanning: false,
    phase: "FAILED",
    errorMessage: errorMsg,
    completedAt: new Date().toISOString(),
  };

  // Limpa após 30 segundos
  globalForScan.scanClearTimer = setTimeout(() => {
    if (globalForScan.scanProgressState && !globalForScan.scanProgressState.isScanning) {
      globalForScan.scanProgressState.phase = "IDLE";
      globalForScan.scanProgressState.errorMessage = null;
    }
  }, 30000);
}

export function resetScanProgress(): void {
  if (globalForScan.scanClearTimer) {
    clearTimeout(globalForScan.scanClearTimer);
    globalForScan.scanClearTimer = undefined;
  }
  globalForScan.scanProgressState = { ...initialProgressState };
}
