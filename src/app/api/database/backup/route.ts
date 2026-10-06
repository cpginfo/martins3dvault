import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError, isAdmin } from "@/lib/auth/session";
import { APP_VERSION } from "@/lib/version";

// Garante que BigInt possa ser serializado em JSON sem erros de runtime
if (!("toJSON" in BigInt.prototype)) {
  Object.defineProperty(BigInt.prototype, "toJSON", {
    value: function () {
      return this.toString();
    },
    configurable: true,
    writable: true,
  });
}

export async function GET(request: Request) {
  try {
    const user = await requireAuth(undefined, request);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem exportar backup do banco" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const download = searchParams.get("download") !== "false";

    // 1. Coleta os registros de todas as tabelas
    const [
      users,
      libraries,
      collections,
      tags,
      models,
      printerSettings,
      materials,
      budgets,
    ] = await Promise.all([
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.library.findMany(),
      prisma.collection.findMany(),
      prisma.tag.findMany(),
      prisma.model.findMany({
        include: {
          files: true,
          assets: true,
          tags: true,
        },
      }),
      prisma.printerSettings.findMany(),
      prisma.printMaterial.findMany(),
      prisma.printBudget.findMany({
        include: {
          accessories: true,
        },
      }),
    ]);

    const timestamp = new Date().toISOString();
    const dateSlug = timestamp.replace(/[:.]/g, "-").slice(0, 19);

    const backupData = {
      system: "Martins3DVault",
      version: APP_VERSION,
      exportedAt: timestamp,
      exportedBy: user.email,
      stats: {
        usersCount: users.length,
        librariesCount: libraries.length,
        collectionsCount: collections.length,
        tagsCount: tags.length,
        modelsCount: models.length,
        filesCount: models.reduce((acc, m) => acc + (m.files?.length || 0), 0),
        printerSettingsCount: printerSettings.length,
        materialsCount: materials.length,
        budgetsCount: budgets.length,
      },
      data: {
        users,
        libraries,
        collections,
        tags,
        models,
        printerSettings,
        materials,
        budgets,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);

    // 2. Salva cópia física no diretório de dados persistentes /data/backups
    const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
    const backupsDir = path.resolve(path.join(storageDataPath, "backups"));
    await fs.promises.mkdir(backupsDir, { recursive: true });

    const localFileName = `martins3dvault_backup_${dateSlug}.json`;
    const localFilePath = path.join(backupsDir, localFileName);
    await fs.promises.writeFile(localFilePath, jsonString, "utf8");

    // 3. Se solicitado download, envia como arquivo para o cliente
    if (download) {
      const headers = new Headers();
      headers.set("Content-Type", "application/json; charset=utf-8");
      headers.set("Content-Length", Buffer.byteLength(jsonString).toString());
      headers.set(
        "Content-Disposition",
        `attachment; filename="${localFileName}"`
      );
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

      return new NextResponse(jsonString, {
        status: 200,
        headers,
      });
    }

    return NextResponse.json({
      success: true,
      fileName: localFileName,
      path: localFilePath,
      stats: backupData.stats,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro ao gerar backup do banco de dados:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao gerar backup" },
      { status: 500 }
    );
  }
}
