import pLimit from "p-limit";
import type { Readable } from "stream";
import type { UserRole } from "@/lib/auth/session";

export const MAX_GLOBAL_CONCURRENT = 15;
export const MAX_USER_CONCURRENT = 3;

// Instância do p-limit para controle global de promessas/tarefas
export const globalLimiter = pLimit(MAX_GLOBAL_CONCURRENT);

// Estado de concorrência ativa em memória
const userActiveSlots = new Map<string, number>();
let globalActiveSlots = 0;

// Deduplicação de conversões em andamento (Single-Flight Lock por fileHash)
const inFlightConversions = new Map<string, Promise<string>>();

// Circuit breaker: controle de tentativas repetidas de violação de 429
interface CircuitBreakerEntry {
  strikes: number[]; // timestamps das infrações 429
  blockedUntil: number | null; // timestamp de término do bloqueio temporário
  reason?: string;
}
const circuitBreakers = new Map<string, CircuitBreakerEntry>();

// Configurações do Circuit Breaker (FASE 4)
const CB_STRIKE_THRESHOLD = 10; // 10 violações 429
const CB_WINDOW_MS = 5 * 60 * 1000; // dentro de 5 minutos
const CB_BLOCK_DURATION_MS = 15 * 60 * 1000; // bloqueio de 15 minutos

export interface ConcurrencySlot {
  allowed: boolean;
  statusCode?: number;
  message?: string;
  userId?: string;
  release: () => void;
  bindToStream: (stream: Readable | any, signal?: AbortSignal) => void;
}

/**
 * Retorna o limite de concorrência permitido de acordo com o papel do usuário (FASE 5)
 */
export function getLimitForRole(role?: UserRole | string): number {
  switch (role) {
    case "ADMIN":
      return MAX_USER_CONCURRENT; // Pode ser estendido no futuro se desejado
    case "OPERATOR":
    case "USER":
    case "EDITOR":
      return MAX_USER_CONCURRENT;
    case "VIEWER":
      return MAX_USER_CONCURRENT;
    default:
      return MAX_USER_CONCURRENT;
  }
}

/**
 * Verifica e adquire um slot de download/conversão para o usuário especificado.
 */
export function acquireDownloadSlot(userId: string, role?: UserRole | string): ConcurrencySlot {
  const now = Date.now();

  // 1. Verifica se o usuário está sob bloqueio temporário do Circuit Breaker (FASE 4)
  const cb = circuitBreakers.get(userId);
  if (cb?.blockedUntil && cb.blockedUntil > now) {
    const remainingMinutes = Math.ceil((cb.blockedUntil - now) / 60000);
    const message = `Acesso temporariamente bloqueado por exceder repetidamente os limites de concorrência. Tente novamente em ${remainingMinutes} minutos.`;
    return {
      allowed: false,
      statusCode: 429,
      message,
      release: () => {},
      bindToStream: () => {},
    };
  }

  // Se o bloqueio anterior expirou, remove-o
  if (cb && cb.blockedUntil && cb.blockedUntil <= now) {
    cb.blockedUntil = null;
    cb.strikes = [];
  }

  // 2. Verifica Limite de Concorrência Global (máximo 15 no processo)
  if (globalActiveSlots >= MAX_GLOBAL_CONCURRENT) {
    return {
      allowed: false,
      statusCode: 429,
      message: `Capacidade global de downloads simultâneos atingida (${MAX_GLOBAL_CONCURRENT}). Aguarde alguns instantes e tente novamente.`,
      release: () => {},
      bindToStream: () => {},
    };
  }

  // 3. Verifica Limite de Concorrência por Usuário (máximo 3)
  const currentCount = userActiveSlots.get(userId) || 0;
  const userLimit = getLimitForRole(role);

  if (currentCount >= userLimit) {
    // Registra strike no Circuit Breaker
    recordCircuitBreakerStrike(userId);

    const message = `Limite de downloads simultâneos atingido (máx. ${userLimit}). Aguarde um dos downloads em andamento finalizar.`;
    return {
      allowed: false,
      statusCode: 429,
      message,
      release: () => {},
      bindToStream: () => {},
    };
  }

  // Aloca slot para o usuário e globalmente
  userActiveSlots.set(userId, currentCount + 1);
  globalActiveSlots++;

  let released = false;

  const release = () => {
    if (released) return;
    released = true;

    const count = userActiveSlots.get(userId) || 0;
    if (count <= 1) {
      userActiveSlots.delete(userId);
    } else {
      userActiveSlots.set(userId, count - 1);
    }

    if (globalActiveSlots > 0) {
      globalActiveSlots--;
    }
  };

  const bindToStream = (stream: any, signal?: AbortSignal) => {
    if (!stream) {
      release();
      return;
    }

    // Se a conexão já tiver sido cancelada pelo cliente
    if (signal?.aborted) {
      release();
      return;
    }

    if (signal) {
      signal.addEventListener("abort", () => release(), { once: true });
    }

    // Suporte a Node.js Readable / fs.ReadStream
    if (typeof stream.on === "function") {
      stream.once("end", () => release());
      stream.once("close", () => release());
      stream.once("error", () => release());
    }
  };

  return {
    allowed: true,
    userId,
    release,
    bindToStream,
  };
}

/**
 * Registra infrações para acionamento do Circuit Breaker
 */
function recordCircuitBreakerStrike(userId: string) {
  const now = Date.now();
  let cb = circuitBreakers.get(userId);
  if (!cb) {
    cb = { strikes: [], blockedUntil: null };
    circuitBreakers.set(userId, cb);
  }

  // Remove strikes fora da janela de 5 minutos
  cb.strikes = cb.strikes.filter((t) => now - t <= CB_WINDOW_MS);
  cb.strikes.push(now);

  if (cb.strikes.length >= CB_STRIKE_THRESHOLD) {
    cb.blockedUntil = now + CB_BLOCK_DURATION_MS;
    cb.reason = `Usuário atingiu ${cb.strikes.length} respostas 429 em 5 minutos.`;
    console.warn(`🚨 [CIRCUIT_BREAKER] Usuário ${userId} bloqueado por 15 minutos por tentativas insistentes de exaustão de downloads.`);
  }
}

/**
 * Deduplicação de conversões de malha em andamento (Single-Flight Lock por fileHash)
 * Se várias requisições concorrentes solicitarem a conversão do mesmo arquivo .3mf,
 * elas aguardam a MESMA Promise em vez de rodar conversões duplicadas no CPU.
 */
export async function getOrConvertMesh(
  fileHash: string,
  convertFn: () => Promise<string>
): Promise<{ path: string; wasDeduped: boolean }> {
  const existing = inFlightConversions.get(fileHash);
  if (existing) {
    const res = await existing;
    return { path: res, wasDeduped: true };
  }

  const promise = (async () => {
    try {
      return await convertFn();
    } finally {
      inFlightConversions.delete(fileHash);
    }
  })();

  inFlightConversions.set(fileHash, promise);
  const resultPath = await promise;
  return { path: resultPath, wasDeduped: false };
}

/**
 * Retorna telemetria e estado de concorrência atual (FASE 4)
 */
export function getConcurrencyStats() {
  const now = Date.now();
  const activeUsers: Array<{ userId: string; activeSlots: number }> = [];

  for (const [uid, count] of userActiveSlots.entries()) {
    activeUsers.push({ userId: uid, activeSlots: count });
  }

  const activeBlocks: Array<{ userId: string; remainingSeconds: number; reason?: string }> = [];
  for (const [uid, cb] of circuitBreakers.entries()) {
    if (cb.blockedUntil && cb.blockedUntil > now) {
      activeBlocks.push({
        userId: uid,
        remainingSeconds: Math.ceil((cb.blockedUntil - now) / 1000),
        reason: cb.reason,
      });
    }
  }

  return {
    globalActiveSlots,
    maxGlobalSlots: MAX_GLOBAL_CONCURRENT,
    maxUserSlots: MAX_USER_CONCURRENT,
    activeUsersCount: activeUsers.length,
    activeUsers,
    inFlightConversionsCount: inFlightConversions.size,
    blockedUsersCount: activeBlocks.length,
    activeBlocks,
  };
}
