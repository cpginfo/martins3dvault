import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const [
      totalModels,
      totalLibraries,
      totalFiles,
      formatGroups,
      recentScans,
      allFilesSize,
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
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
