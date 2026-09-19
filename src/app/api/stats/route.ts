import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
