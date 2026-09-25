import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAuth, handleAuthError } from "@/lib/auth/session";
import { getCacheStats } from "@/lib/storage/cache-ops";
import { getConcurrencyStats } from "@/lib/security/concurrency-limiter";
import { getRecentDownloadLogs } from "@/lib/security/download-logger";

export async function GET(request: Request) {
  try {
    await requireAuth(undefined, request);

    const [
      totalModels,
      totalLibraries,
      totalFiles,
      formatGroups,
      recentScans,
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
        take: 5,
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

    return NextResponse.json({
      totalModels,
      totalLibraries,
      totalFiles,
      totalSizeBytes: Number(allFilesSize._sum.fileSize || 0),
      formatDistribution,
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
