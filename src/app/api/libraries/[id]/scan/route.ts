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

    const library = await prisma.library.findUnique({
      where: { id },
    });

    if (!library) {
      return NextResponse.json({ error: "Biblioteca não encontrada" }, { status: 404 });
    }

    if (library.scanStatus === "SCANNING") {
      return NextResponse.json({ error: "Uma varredura já está em andamento para esta biblioteca" }, { status: 409 });
    }

    // Executa a varredura
    const stats = await scanLibrary(id);

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
