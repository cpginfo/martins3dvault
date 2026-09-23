import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { scanLibrary } from "@/lib/scanner/crawler";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await props.params;

    let subFolder: string | undefined;
    let forceFullScan = false;

    // Tenta obter parâmetros opcionais do corpo ou da URL
    try {
      const body = await request.json();
      if (body.subFolder) subFolder = String(body.subFolder);
      if (body.forceFullScan) forceFullScan = Boolean(body.forceFullScan);
    } catch {
      // Nenhum body JSON enviado
    }

    const { searchParams } = new URL(request.url);
    if (!subFolder && searchParams.get("subFolder")) {
      subFolder = searchParams.get("subFolder")!;
    }
    if (!forceFullScan && searchParams.get("forceFullScan") === "true") {
      forceFullScan = true;
    }

    const library = await prisma.library.findUnique({
      where: { id },
    });

    if (!library) {
      return NextResponse.json({ error: "Biblioteca não encontrada" }, { status: 404 });
    }

    if (library.scanStatus === "SCANNING") {
      return NextResponse.json(
        { error: "Uma varredura já está em andamento para esta biblioteca" },
        { status: 409 }
      );
    }

    // Executa a varredura incremental inteligente
    const stats = await scanLibrary(id, { subFolder, forceFullScan });

    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
