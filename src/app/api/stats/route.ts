import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { getCacheStats } from "@/lib/storage/cache-ops";
import { getConcurrencyStats } from "@/lib/security/concurrency-limiter";
import { getRecentDownloadLogs } from "@/lib/security/download-logger";

import { getScanProgress } from "@/lib/scanner/scan-progress";

export async function GET(request: Request) {
  try {
    await requireAuth(undefined, request);

    const [
      totalModels,
      totalLibraries,
      totalFiles,
      formatGroups,
      rawRecentScans,
      allFilesSize,
      cacheStats,
    ] = await Promise.all([
      prisma.model.count(),
      prisma.library.count(),
      prisma.modelFile.count(),
      prisma.modelFile.groupBy({
        by: ["format"],
        _count: { id: true },
      }),
      prisma.scanJob.findMany({
        take: 20,
        orderBy: { startedAt: "desc" },
        include: { library: { select: { name: true } } },
      }),
      prisma.modelFile.aggregate({
        _sum: { fileSize: true },
      }),
      getCacheStats(),
    ]);

    const formatDistribution: Record<string, number> = {};
    for (const group of formatGroups) {
      formatDistribution[group.format] = group._count.id;
    }

    const recentScans = rawRecentScans.map((scan) => {
      let trigger: "MANUAL" | "STARTUP" = "MANUAL";
      if (scan.log?.startsWith("[STARTUP]")) {
        trigger = "STARTUP";
      } else if (scan.log?.startsWith("[MANUAL]")) {
        trigger = "MANUAL";
      }

      return {
        id: scan.id,
        status: scan.status,
        scannedCount: scan.scannedCount,
        addedCount: scan.addedCount,
        updatedCount: scan.updatedCount,
        deletedCount: scan.deletedCount,
        startedAt: scan.startedAt,
        completedAt: scan.completedAt,
        log: scan.log,
        trigger,
        library: scan.library,
      };
    });

    return NextResponse.json({
      totalModels,
      totalLibraries,
      totalFiles,
      totalSizeBytes: Number(allFilesSize._sum.fileSize || 0),
      formatDistribution,
      currentScan: getScanProgress(),
      recentScans,
      cache: {
        sizeBytes: cacheStats.sizeBytes,
        fileCount: cacheStats.fileCount,
      },
      concurrency: getConcurrencyStats(),
      downloadLogs: getRecentDownloadLogs(20),
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
