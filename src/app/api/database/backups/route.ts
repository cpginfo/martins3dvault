import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { requireAuth, handleAuthError, isAdmin } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    const user = await requireAuth(undefined, request);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem visualizar backups" },
        { status: 403 }
      );
    }

    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
    const backupsDir = path.resolve(path.join(storageDataPath, "backups"));

    if (!fs.existsSync(backupsDir)) {
      return NextResponse.json({ backups: [], totalBackups: 0 });
    }

    const entries = await fs.promises.readdir(backupsDir, { withFileTypes: true });
    const backupFiles = entries.filter(
      (e) => e.isFile() && e.name.endsWith(".json")
    );

    const backups = await Promise.all(
      backupFiles.map(async (file) => {
        const filePath = path.join(backupsDir, file.name);
        const stat = await fs.promises.stat(filePath);
        return {
          fileName: file.name,
          sizeBytes: stat.size,
          createdAt: stat.birthtime || stat.mtime,
          downloadUrl: `/api/database/backups/${encodeURIComponent(file.name)}`,
        };
      })
    );

    // Ordena do mais recente para o mais antigo
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      backups,
      totalBackups: backups.length,
      backupsDir,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro ao listar backups:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao listar backups" },
      { status: 500 }
    );
  }
}
