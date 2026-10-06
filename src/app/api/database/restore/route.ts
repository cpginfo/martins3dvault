import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError, isAdmin } from "@/lib/auth/session";

export async function POST(request: Request) {
  try {
    const user = await requireAuth(undefined, request);
    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem restaurar backups do banco" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let backupData = body.backupData;

    if (!backupData && body.fileName) {
      const safeFileName = path.basename(body.fileName);
      const storageDataPath = process.env.STORAGE_DATA_PATH || "./data";
      const fullPath = path.join(storageDataPath, "backups", safeFileName);

      if (!fs.existsSync(fullPath)) {
        return NextResponse.json({ error: "Arquivo de backup não encontrado" }, { status: 404 });
      }

      const raw = await fs.promises.readFile(fullPath, "utf-8");
      backupData = JSON.parse(raw);
    }

    if (!backupData || !backupData.data) {
      return NextResponse.json(
        { error: "Estrutura do arquivo de backup inválida ou corrompida" },
        { status: 400 }
      );
    }

    const {
      libraries = [],
      collections = [],
      tags = [],
      models = [],
      printerSettings = [],
      materials = [],
      budgets = [],
    } = backupData.data;

    let restoredLibraries = 0;
    let restoredCollections = 0;
    let restoredTags = 0;
    let restoredModels = 0;
    let restoredBudgets = 0;

    // 1. Restaurar Tags
    for (const tag of tags) {
      if (!tag.id || !tag.name || !tag.slug) continue;
      await prisma.tag.upsert({
        where: { id: tag.id },
        create: {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          createdAt: tag.createdAt ? new Date(tag.createdAt) : undefined,
        },
        update: {
          name: tag.name,
          slug: tag.slug,
        },
      });
      restoredTags++;
    }

    // 2. Restaurar Bibliotecas
    for (const lib of libraries) {
      if (!lib.id || !lib.name || !lib.path) continue;
      await prisma.library.upsert({
        where: { id: lib.id },
        create: {
          id: lib.id,
          name: lib.name,
          path: lib.path,
          enabled: lib.enabled ?? true,
          scanStatus: lib.scanStatus || "IDLE",
          lastScanAt: lib.lastScanAt ? new Date(lib.lastScanAt) : null,
          createdAt: lib.createdAt ? new Date(lib.createdAt) : undefined,
          updatedAt: lib.updatedAt ? new Date(lib.updatedAt) : undefined,
        },
        update: {
          name: lib.name,
          path: lib.path,
          enabled: lib.enabled ?? true,
        },
      });
      restoredLibraries++;
    }

    // 3. Restaurar Coleções (1ª passada: sem parentId para evitar violação de integridade referencial)
    for (const col of collections) {
      if (!col.id || !col.name || !col.slug) continue;
      await prisma.collection.upsert({
        where: { id: col.id },
        create: {
          id: col.id,
          name: col.name,
          slug: col.slug,
          folderPath: col.folderPath || null,
          description: col.description || null,
          coverImage: col.coverImage || null,
          createdAt: col.createdAt ? new Date(col.createdAt) : undefined,
          updatedAt: col.updatedAt ? new Date(col.updatedAt) : undefined,
        },
        update: {
          name: col.name,
          folderPath: col.folderPath || null,
          description: col.description || null,
          coverImage: col.coverImage || null,
        },
      });
      restoredCollections++;
    }
    // 2ª passada: conectar parentId
    for (const col of collections) {
      if (col.id && col.parentId) {
        await prisma.collection.update({
          where: { id: col.id },
          data: { parentId: col.parentId },
        }).catch(() => {});
      }
    }

    // 4. Restaurar Materiais
    for (const mat of materials) {
      if (!mat.id || !mat.name) continue;
      await prisma.printMaterial.upsert({
        where: { id: mat.id },
        create: {
          id: mat.id,
          name: mat.name,
          costPerKg: Number(mat.costPerKg) || 120,
          density: mat.density !== null ? Number(mat.density) : 1.24,
          color: mat.color || null,
          brand: mat.brand || null,
          createdAt: mat.createdAt ? new Date(mat.createdAt) : undefined,
          updatedAt: mat.updatedAt ? new Date(mat.updatedAt) : undefined,
        },
        update: {
          name: mat.name,
          costPerKg: Number(mat.costPerKg) || 120,
          density: mat.density !== null ? Number(mat.density) : 1.24,
          color: mat.color || null,
          brand: mat.brand || null,
        },
      });
    }

    // 5. Restaurar Parâmetros de Impressora
    for (const ps of printerSettings) {
      if (!ps.id) continue;
      await prisma.printerSettings.upsert({
        where: { id: ps.id },
        create: {
          id: ps.id,
          printerName: ps.printerName || "Impressora 3D Principal",
          printerCost: Number(ps.printerCost) || 2500,
          powerWatts: Number(ps.powerWatts) || 250,
          lifespanHours: Number(ps.lifespanHours) || 3000,
          electricityKwhCost: Number(ps.electricityKwhCost) || 0.85,
          manualHourlyRate: Number(ps.manualHourlyRate) || 35,
          defaultMarkup: Number(ps.defaultMarkup) || 100,
          isDefault: ps.isDefault ?? true,
          createdAt: ps.createdAt ? new Date(ps.createdAt) : undefined,
          updatedAt: ps.updatedAt ? new Date(ps.updatedAt) : undefined,
        },
        update: {
          printerName: ps.printerName || "Impressora 3D Principal",
          printerCost: Number(ps.printerCost) || 2500,
          powerWatts: Number(ps.powerWatts) || 250,
          lifespanHours: Number(ps.lifespanHours) || 3000,
          electricityKwhCost: Number(ps.electricityKwhCost) || 0.85,
          manualHourlyRate: Number(ps.manualHourlyRate) || 35,
          defaultMarkup: Number(ps.defaultMarkup) || 100,
        },
      });
    }

    // 6. Restaurar Modelos (e seus arquivos/assets)
    for (const mod of models) {
      if (!mod.id || !mod.name || !mod.folderPath || !mod.libraryId) continue;

      await prisma.model.upsert({
        where: { id: mod.id },
        create: {
          id: mod.id,
          name: mod.name,
          slug: mod.slug || mod.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          folderPath: mod.folderPath,
          libraryId: mod.libraryId,
          collectionId: mod.collectionId || null,
          description: mod.description || null,
          author: mod.author || null,
          license: mod.license || null,
          isFavorite: mod.isFavorite ?? false,
          isPrinted: mod.isPrinted ?? false,
          printedAt: mod.printedAt ? new Date(mod.printedAt) : null,
          coverImage: mod.coverImage || null,
          filamentType: mod.filamentType || null,
          nozzleSize: mod.nozzleSize !== null && mod.nozzleSize !== undefined ? Number(mod.nozzleSize) : null,
          infillDensity: mod.infillDensity !== null && mod.infillDensity !== undefined ? Number(mod.infillDensity) : null,
          layerHeight: mod.layerHeight !== null && mod.layerHeight !== undefined ? Number(mod.layerHeight) : null,
          printTimeMinutes: mod.printTimeMinutes !== null && mod.printTimeMinutes !== undefined ? Number(mod.printTimeMinutes) : null,
          weightGrams: mod.weightGrams !== null && mod.weightGrams !== undefined ? Number(mod.weightGrams) : null,
          manualTimeMinutes: mod.manualTimeMinutes !== null && mod.manualTimeMinutes !== undefined ? Number(mod.manualTimeMinutes) : null,
          notes: mod.notes || null,
          createdAt: mod.createdAt ? new Date(mod.createdAt) : undefined,
          updatedAt: mod.updatedAt ? new Date(mod.updatedAt) : undefined,
        },
        update: {
          name: mod.name,
          collectionId: mod.collectionId || null,
          description: mod.description || null,
          author: mod.author || null,
          license: mod.license || null,
          isFavorite: mod.isFavorite ?? false,
          isPrinted: mod.isPrinted ?? false,
          printedAt: mod.printedAt ? new Date(mod.printedAt) : null,
          coverImage: mod.coverImage || null,
          filamentType: mod.filamentType || null,
          notes: mod.notes || null,
        },
      });
      restoredModels++;

      // Arquivos do modelo
      if (Array.isArray(mod.files)) {
        for (const f of mod.files) {
          if (!f.id || !f.fileName || !f.relativePath) continue;
          await prisma.modelFile.upsert({
            where: { id: f.id },
            create: {
              id: f.id,
              modelId: mod.id,
              fileName: f.fileName,
              relativePath: f.relativePath,
              fileSize: BigInt(f.fileSize || 0),
              fileHash: f.fileHash || null,
              format: f.format || "STL",
              mimeType: f.mimeType || null,
              dimensionsX: f.dimensionsX !== null && f.dimensionsX !== undefined ? Number(f.dimensionsX) : null,
              dimensionsY: f.dimensionsY !== null && f.dimensionsY !== undefined ? Number(f.dimensionsY) : null,
              dimensionsZ: f.dimensionsZ !== null && f.dimensionsZ !== undefined ? Number(f.dimensionsZ) : null,
              triangleCount: f.triangleCount !== null && f.triangleCount !== undefined ? Number(f.triangleCount) : null,
              isPrimary: f.isPrimary ?? false,
              isPrinted: f.isPrinted ?? false,
              createdAt: f.createdAt ? new Date(f.createdAt) : undefined,
              updatedAt: f.updatedAt ? new Date(f.updatedAt) : undefined,
            },
            update: {
              fileName: f.fileName,
              relativePath: f.relativePath,
              fileSize: BigInt(f.fileSize || 0),
              fileHash: f.fileHash || null,
              format: f.format || "STL",
            },
          });
        }
      }

      // Assets do modelo
      if (Array.isArray(mod.assets)) {
        for (const a of mod.assets) {
          if (!a.id || !a.fileName || !a.relativePath) continue;
          await prisma.modelAsset.upsert({
            where: { id: a.id },
            create: {
              id: a.id,
              modelId: mod.id,
              fileName: a.fileName,
              relativePath: a.relativePath,
              assetType: a.assetType || "OTHER",
              fileSize: BigInt(a.fileSize || 0),
              createdAt: a.createdAt ? new Date(a.createdAt) : undefined,
              updatedAt: a.updatedAt ? new Date(a.updatedAt) : undefined,
            },
            update: {
              fileName: a.fileName,
              relativePath: a.relativePath,
              assetType: a.assetType || "OTHER",
              fileSize: BigInt(a.fileSize || 0),
            },
          });
        }
      }
    }

    // 7. Restaurar Orçamentos
    for (const b of budgets) {
      if (!b.id || !b.productName) continue;
      await prisma.printBudget.upsert({
        where: { id: b.id },
        create: {
          id: b.id,
          productName: b.productName,
          customerName: b.customerName || null,
          printTimeMinutes: Number(b.printTimeMinutes) || 0,
          weightGrams: Number(b.weightGrams) || 0,
          materialId: b.materialId || null,
          materialName: b.materialName || "Material",
          materialCostPerKg: Number(b.materialCostPerKg) || 0,
          modelingTimeMinutes: Number(b.modelingTimeMinutes) || 0,
          assemblyTimeMinutes: Number(b.assemblyTimeMinutes) || 0,
          markupPercent: Number(b.markupPercent) || 100,
          powerWatts: Number(b.powerWatts) || 0,
          electricityKwhCost: Number(b.electricityKwhCost) || 0,
          printerCost: Number(b.printerCost) || 0,
          lifespanHours: Number(b.lifespanHours) || 0,
          manualHourlyRate: Number(b.manualHourlyRate) || 0,
          energyCost: Number(b.energyCost) || 0,
          depreciationCost: Number(b.depreciationCost) || 0,
          materialCost: Number(b.materialCost) || 0,
          laborCost: Number(b.laborCost) || 0,
          accessoriesCost: Number(b.accessoriesCost) || 0,
          totalCost: Number(b.totalCost) || 0,
          suggestedPrice: Number(b.suggestedPrice) || 0,
          simulatedProfit: Number(b.simulatedProfit) || 0,
          isSale: b.isSale ?? false,
          finalPrice: b.finalPrice !== null && b.finalPrice !== undefined ? Number(b.finalPrice) : null,
          actualProfit: b.actualProfit !== null && b.actualProfit !== undefined ? Number(b.actualProfit) : null,
          priceDifference: b.priceDifference !== null && b.priceDifference !== undefined ? Number(b.priceDifference) : null,
          soldAt: b.soldAt ? new Date(b.soldAt) : null,
          notes: b.notes || null,
          createdAt: b.createdAt ? new Date(b.createdAt) : undefined,
          updatedAt: b.updatedAt ? new Date(b.updatedAt) : undefined,
        },
        update: {
          productName: b.productName,
          customerName: b.customerName || null,
          isSale: b.isSale ?? false,
          finalPrice: b.finalPrice !== null && b.finalPrice !== undefined ? Number(b.finalPrice) : null,
          actualProfit: b.actualProfit !== null && b.actualProfit !== undefined ? Number(b.actualProfit) : null,
          priceDifference: b.priceDifference !== null && b.priceDifference !== undefined ? Number(b.priceDifference) : null,
          soldAt: b.soldAt ? new Date(b.soldAt) : null,
          notes: b.notes || null,
        },
      });

      if (Array.isArray(b.accessories)) {
        for (const acc of b.accessories) {
          if (!acc.id || !acc.name) continue;
          await prisma.printBudgetAccessory.upsert({
            where: { id: acc.id },
            create: {
              id: acc.id,
              budgetId: b.id,
              name: acc.name,
              unitPrice: Number(acc.unitPrice) || 0,
              quantity: Number(acc.quantity) || 1,
              totalPrice: Number(acc.totalPrice) || 0,
              createdAt: acc.createdAt ? new Date(acc.createdAt) : undefined,
            },
            update: {
              name: acc.name,
              unitPrice: Number(acc.unitPrice) || 0,
              quantity: Number(acc.quantity) || 1,
              totalPrice: Number(acc.totalPrice) || 0,
            },
          });
        }
      }
      restoredBudgets++;
    }

    return NextResponse.json({
      success: true,
      message: "Restauração de banco de dados concluída com sucesso.",
      stats: {
        restoredTags,
        restoredLibraries,
        restoredCollections,
        restoredModels,
        restoredBudgets,
      },
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;

    console.error("Erro ao restaurar banco de dados:", err);
    return NextResponse.json(
      { error: err?.message || "Erro interno ao restaurar banco de dados" },
      { status: 500 }
    );
  }
}
