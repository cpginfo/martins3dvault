import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAuth, handleAuthError, isAdmin } from "@/lib/auth/session";

export async function GET(
  request: Request,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const user = await requireAuth(undefined, request);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const params = await props.params;
    const fileName = params.filename;

    if (!fileName || !fileName.endsWith(".json")) {
      return new NextResponse("Arquivo inválido", { status: 400 });
    }

    // Proteção contra path traversal
    const safeFileName = path.basename(fileName);
    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
    const backupsDir = path.resolve(path.join(storageDataPath, "backups"));
    const fullPath = path.join(backupsDir, safeFileName);

    if (!fs.existsSync(fullPath)) {
      return new NextResponse("Backup não encontrado", { status: 404 });
    }

    const stat = await fs.promises.stat(fullPath);
    const fileStream = fs.createReadStream(fullPath);

    const readable = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk) => controller.enqueue(chunk));
        fileStream.on("end", () => controller.close());
        fileStream.on("error", (err) => controller.error(err));
      },
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Content-Length", stat.size.toString());
    headers.set(
      "Content-Disposition",
      `attachment; filename="${safeFileName}"`
    );

    return new NextResponse(readable, { status: 200, headers });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro ao baixar backup:", err);
    return new NextResponse("Erro ao baixar backup", { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ filename: string }> }
) {
  try {
    const user = await requireAuth(undefined, request);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Acesso restrito a administradores" },
        { status: 403 }
      );
    }

    const params = await props.params;
    const fileName = params.filename;

    if (!fileName || !fileName.endsWith(".json")) {
      return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
    }

    // Proteção contra path traversal
    const safeFileName = path.basename(fileName);
    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
    const backupsDir = path.resolve(path.join(storageDataPath, "backups"));
    const fullPath = path.join(backupsDir, safeFileName);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Backup não encontrado" }, { status: 404 });
    }

    await fs.promises.unlink(fullPath);

    return NextResponse.json({
      success: true,
      message: `Backup ${safeFileName} removido com sucesso.`,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro ao excluir backup:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao excluir backup" },
      { status: 500 }
    );
  }
}
