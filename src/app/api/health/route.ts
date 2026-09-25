import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { APP_VERSION } from "@/lib/version";
import { getConcurrencyStats } from "@/lib/security/concurrency-limiter";

export async function GET() {
  try {
    // Validação rápida de conectividade com o banco
    await prisma.$queryRaw`SELECT 1`;

    return NextResponse.json(
      {
        status: "healthy",
        version: APP_VERSION,
        uptime: process.uptime(),
        concurrency: getConcurrencyStats(),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: err.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
