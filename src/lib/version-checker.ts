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

// Cache em memória no servidor Next.js (10 minutos de TTL para requisições automáticas)
const CACHE_TTL_MS = 10 * 60 * 1000;
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
 * Consulta a última versão publicada no GitHub (Releases e Tags)
 */
export async function checkGitHubRelease(force = false): Promise<VersionCheckResult> {
  const repo = process.env.GITHUB_REPOSITORY || "cpginfo/martins3dvault";
  const now = Date.now();

  // Se a checagem for forçada (clique no botão), limpa o cache em memória
  if (force) {
    cachedResult = null;
  } else if (cachedResult && now - cachedResult.timestamp < CACHE_TTL_MS) {
    // Retorna cache caso não tenha expirado e não seja forçado
    return cachedResult.data;
  }

  const defaultResult: VersionCheckResult = {
    currentVersion: APP_VERSION,
    latestVersion: null,
    hasUpdate: false,
    releaseName: null,
    releaseUrl: `https://github.com/${repo}/releases`,
    releaseNotes: null,
    publishedAt: null,
    checkedAt: new Date().toISOString(),
    repository: repo,
  };

  try {
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "Martins3DVault-VersionChecker",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
    };

    if (process.env.GITHUB_TOKEN) {
      headers["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    let latestTag = "";
    let releaseName = "";
    let releaseUrl = `https://github.com/${repo}/releases`;
    let releaseNotes = "";
    let publishedAt: string | null = null;

    // 1. Tenta obter a última release oficial do GitHub
    try {
      const releaseApiUrl = `https://api.github.com/repos/${repo}/releases/latest?_t=${Date.now()}`;
      const releaseRes = await fetch(releaseApiUrl, {
        headers,
        signal: AbortSignal.timeout(6000),
        cache: "no-store",
      });

      if (releaseRes.ok) {
        const releaseData = await releaseRes.json();
        latestTag = releaseData.tag_name || "";
        releaseName = releaseData.name || latestTag;
        releaseUrl = releaseData.html_url || releaseUrl;
        releaseNotes = releaseData.body || "";
        publishedAt = releaseData.published_at || null;
      }
    } catch (e: any) {
      console.warn("⚠️ [VersionChecker] Erro ao buscar release/latest:", e?.message);
    }

    // 2. Consulta também /tags para garantir que tags recém-publicadas (ex: v1.10.0)
    // sejam detectadas imediatamente mesmo se a release ainda estiver compilando no CI
    try {
      const tagsApiUrl = `https://api.github.com/repos/${repo}/tags?per_page=3&_t=${Date.now()}`;
      const tagsRes = await fetch(tagsApiUrl, {
        headers,
        signal: AbortSignal.timeout(4000),
        cache: "no-store",
      });

      if (tagsRes.ok) {
        const tags = await tagsRes.json();
        if (Array.isArray(tags) && tags.length > 0) {
          const newestTag = tags[0].name;
          // Se a tag mais recente for maior que a obtida no /releases/latest, usa a tag
          if (!latestTag || isNewerVersion(latestTag, newestTag)) {
            latestTag = newestTag;
            if (!releaseName || releaseName === latestTag) {
              releaseName = `Release ${newestTag}`;
            }
            releaseUrl = `https://github.com/${repo}/releases/tag/${newestTag}`;
            if (!releaseNotes) {
              releaseNotes = `Uma nova versão (${newestTag}) foi publicada no GitHub.`;
            }
          }
        }
      }
    } catch (e: any) {
      console.warn("⚠️ [VersionChecker] Erro ao consultar tags:", e?.message);
    }

    if (!latestTag) {
      // Se não encontrou nenhuma release ou tag
      latestTag = APP_VERSION;
    }

    const hasUpdate = isNewerVersion(APP_VERSION, latestTag);

    const result: VersionCheckResult = {
      currentVersion: APP_VERSION,
      latestVersion: latestTag,
      hasUpdate,
      releaseName: releaseName || `Release ${latestTag}`,
      releaseUrl,
      releaseNotes,
      publishedAt,
      checkedAt: new Date().toISOString(),
      repository: repo,
    };

    cachedResult = { timestamp: now, data: result };
    return result;
  } catch (error: any) {
    console.warn("⚠️ [VersionChecker] Falha geral ao verificar versão no GitHub:", error?.message);

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
