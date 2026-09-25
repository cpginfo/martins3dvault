import { APP_VERSION, RAW_VERSION } from "@/lib/version";

export interface VersionCheckResult {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  releaseName: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  publishedAt: string | null;
  checkedAt: string;
  repository: string;
  error?: string;
}

// Cache em memória no servidor Next.js (30 minutos de TTL)
const CACHE_TTL_MS = 30 * 60 * 1000;
let cachedResult: { timestamp: number; data: VersionCheckResult } | null = null;

/**
 * Converte string semver (ex: "v1.9.1", "1.10.0-beta") para array de números [1, 9, 1]
 */
export function parseSemver(v: string): number[] {
  if (!v) return [0, 0, 0];
  const clean = v.replace(/^v/i, "").trim();
  const base = clean.split("-")[0]; // remove sufixos de pré-release
  return base.split(".").map((part) => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
}

/**
 * Compara duas versões semver:
 * Retorna:
 *   1 se latest for MAIOR que current (atualização disponível)
 *  -1 se current for MAIOR que latest
 *   0 se forem idênticas
 */
export function compareVersions(current: string, latest: string): number {
  const currentParts = parseSemver(current);
  const latestParts = parseSemver(latest);
  const maxLength = Math.max(currentParts.length, latestParts.length);

  for (let i = 0; i < maxLength; i++) {
    const c = currentParts[i] ?? 0;
    const l = latestParts[i] ?? 0;
    if (l > c) return 1;
    if (l < c) return -1;
  }

  // Se os números forem idênticos, trata sufixos pré-release (release final > pré-release)
  const currentHasPre = current.includes("-");
  const latestHasPre = latest.includes("-");
  if (currentHasPre && !latestHasPre) return 1;
  if (!currentHasPre && latestHasPre) return -1;

  return 0;
}

/**
 * Verifica se latest é uma versão mais nova que current
 */
export function isNewerVersion(current: string, latest: string): boolean {
  return compareVersions(current, latest) > 0;
}

/**
 * Consulta a última versão publicada no GitHub Releases
 */
export async function checkGitHubRelease(force = false): Promise<VersionCheckResult> {
  const repo = process.env.GITHUB_REPOSITORY || "cpginfo/martins3dvault";
  const now = Date.now();

  // Retorna cache caso não tenha expirado e não seja uma checagem forçada
  if (!force && cachedResult && now - cachedResult.timestamp < CACHE_TTL_MS) {
    return cachedResult.data;
  }

  const defaultResult: VersionCheckResult = {
    currentVersion: APP_VERSION,
    latestVersion: null,
    hasUpdate: false,
    releaseName: null,
    releaseUrl: null,
    releaseNotes: null,
    publishedAt: null,
    checkedAt: new Date().toISOString(),
    repository: repo,
  };

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Martins3DVault-VersionChecker",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const apiUrl = `https://api.github.com/repos/${repo}/releases/latest`;
    const response = await fetch(apiUrl, {
      headers,
      signal: AbortSignal.timeout(6000), // Timeout de 6s para evitar bloqueio
      next: { revalidate: 1800 }, // Suporte a cache Next.js fetch
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Nenhuma release encontrada
        const res = { ...defaultResult, latestVersion: APP_VERSION };
        cachedResult = { timestamp: now, data: res };
        return res;
      }
      throw new Error(`GitHub API retornou status HTTP ${response.status}`);
    }

    const data = await response.json();
    const latestTag = data.tag_name || "";
    const hasUpdate = isNewerVersion(APP_VERSION, latestTag);

    const result: VersionCheckResult = {
      currentVersion: APP_VERSION,
      latestVersion: latestTag || null,
      hasUpdate,
      releaseName: data.name || latestTag,
      releaseUrl: data.html_url || `https://github.com/${repo}/releases`,
      releaseNotes: data.body || "",
      publishedAt: data.published_at || null,
      checkedAt: new Date().toISOString(),
      repository: repo,
    };

    cachedResult = { timestamp: now, data: result };
    return result;
  } catch (error: any) {
    console.warn("⚠️ [VersionChecker] Falha ao verificar versão no GitHub:", error?.message);

    // Se já tínhamos cache anterior, use-o
    if (cachedResult) {
      return {
        ...cachedResult.data,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      ...defaultResult,
      error: error?.message || "Não foi possível conectar ao GitHub",
    };
  }
}
