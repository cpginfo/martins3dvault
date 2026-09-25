import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import prisma from "@/lib/prisma";
import { requireAdmin, requireAuth, handleAuthError } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAuth(undefined, request);

    const libraries = await prisma.library.findMany({
      include: {
        _count: {
          select: { models: true },
        },
        scanJobs: {
          take: 1,
          orderBy: { startedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enriched = libraries.map((lib) => ({
      id: lib.id,
      name: lib.name,
      path: lib.path,
      enabled: lib.enabled,
      lastScanAt: lib.lastScanAt,
      scanStatus: lib.scanStatus,
      lastError: lib.lastError,
      modelsCount: lib._count.models,
      lastJob: lib.scanJobs[0] || null,
      existsOnDisk: fs.existsSync(path.resolve(lib.path)),
    }));

    return NextResponse.json(enriched);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const { name, path: dirPath } = await request.json();

    if (!name || !dirPath) {
      return NextResponse.json({ error: "Nome e caminho são obrigatórios" }, { status: 400 });
    }

    const resolvedPath = path.resolve(dirPath);
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: `O diretório especificado não existe no servidor: ${resolvedPath}` },
        { status: 400 }
      );
    }

    const library = await prisma.library.create({
      data: {
        name,
        path: resolvedPath,
      },
    });

    return NextResponse.json(library, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    if (err.code === "P2002") {
      return NextResponse.json({ error: "Já existe uma biblioteca cadastrada com este caminho" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
