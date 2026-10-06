import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { scanLibrary } from "@/lib/scanner/crawler";
import { requireOperator, handleAuthError } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    await requireOperator(request);

    const libraries = await prisma.library.findMany({
      where: { enabled: true },
    });

    if (libraries.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Nenhuma biblioteca ativa encontrada para varredura.",
        count: 0,
      });
    }

    // Executa varredura de todas as bibliotecas em background assíncrono para liberar o cliente imediatamente
    (async () => {
      for (const lib of libraries) {
        try {
          // Se já estiver em varredura, ignora
          const current = await prisma.library.findUnique({
            where: { id: lib.id },
            select: { scanStatus: true },
          });
          if (current?.scanStatus === "SCANNING") continue;

          await scanLibrary(lib.id, { trigger: "MANUAL" });
        } catch (scanErr) {
          console.error(`[Scan All] Falha na varredura da biblioteca ${lib.name} (${lib.id}):`, scanErr);
        }
      }
    })().catch((err) => {
      console.error("[Scan All] Erro geral na execução em segundo plano:", err);
    });

    return NextResponse.json(
      {
        success: true,
        message: `Varredura iniciada em segundo plano para ${libraries.length} biblioteca(s).`,
        count: libraries.length,
      },
      { status: 202 }
    );
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro ao disparar varredura global:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao iniciar varredura" },
      { status: 500 }
    );
  }
}
