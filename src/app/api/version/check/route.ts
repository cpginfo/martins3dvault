import { NextRequest, NextResponse } from "next/server";
import { checkGitHubRelease, isNewerVersion, VersionCheckResult } from "@/lib/version-checker";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const force = searchParams.get("force") === "true";
    const mock = searchParams.get("mock");

    // Consulta release real no GitHub
    const result = await checkGitHubRelease(force);

    // Suporte a modo mock para validação e testes da interface
    if (mock) {
      const mockTag = mock.startsWith("v") ? mock : `v${mock}`;
      const hasUpdate = isNewerVersion(APP_VERSION, mockTag);
      const mockResult: VersionCheckResult = {
        ...result,
        latestVersion: mockTag,
        hasUpdate,
        releaseName: `Release ${mockTag} (Simulação de Atualização)`,
        releaseNotes: `### Novidades da versão ${mockTag}\n- 🚀 Melhorias de desempenho e telemetria 3D\n- 🛡️ Notificação automática de versão no GitHub\n- 🐞 Correções e estabilidade geral`,
        checkedAt: new Date().toISOString(),
      };
      return NextResponse.json(mockResult, {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      });
    }

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (error: any) {
    console.error("Erro ao verificar versão:", error);
    return NextResponse.json(
      {
        currentVersion: APP_VERSION,
        latestVersion: null,
        hasUpdate: false,
        error: error?.message || "Erro interno ao verificar versão",
      },
      { status: 500 }
    );
  }
}
