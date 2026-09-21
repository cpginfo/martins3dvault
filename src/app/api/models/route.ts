import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const format = searchParams.get("format"); // STL, 3MF, OBJ
    const printedParam = searchParams.get("printed");
    const libraryId = searchParams.get("libraryId");
    const collectionId = searchParams.get("collectionId");
    const favorite = searchParams.get("favorite") === "true";
    const sort = searchParams.get("sort") || "date_desc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "24")));
    const skip = (page - 1) * limit;

    const where: any = {};

    const trimmedQ = q.trim();
    if (trimmedQ) {
      const terms = trimmedQ.split(/\s+/).filter(Boolean);
      if (terms.length === 1) {
        const term = terms[0];
        where.OR = [
          { name: { contains: term, mode: "insensitive" } },
          { folderPath: { contains: term, mode: "insensitive" } },
          { description: { contains: term, mode: "insensitive" } },
          { collection: { name: { contains: term, mode: "insensitive" } } },
          { library: { name: { contains: term, mode: "insensitive" } } },
          { tags: { some: { name: { contains: term, mode: "insensitive" } } } },
          { files: { some: { fileName: { contains: term, mode: "insensitive" } } } },
        ];
      } else {
        where.AND = terms.map((term) => ({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { folderPath: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            { collection: { name: { contains: term, mode: "insensitive" } } },
            { library: { name: { contains: term, mode: "insensitive" } } },
            { tags: { some: { name: { contains: term, mode: "insensitive" } } } },
            { files: { some: { fileName: { contains: term, mode: "insensitive" } } } },
          ],
        }));
      }
    }

    if (printedParam === "true") {
      where.isPrinted = true;
    } else if (printedParam === "false") {
      where.isPrinted = false;
    }

    if (libraryId) {
      where.libraryId = libraryId;
    }

    if (collectionId) {
      where.collectionId = collectionId;
    }

    if (favorite) {
      where.isFavorite = true;
    }

    if (format) {
      where.files = {
        some: {
          format: format.toUpperCase(),
        },
      };
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "name_asc") orderBy = { name: "asc" };
    else if (sort === "name_desc") orderBy = { name: "desc" };
    else if (sort === "date_asc") orderBy = { createdAt: "asc" };
    else if (sort === "date_desc") orderBy = { createdAt: "desc" };

    const [total, models] = await Promise.all([
      prisma.model.count({ where }),
      prisma.model.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          library: { select: { id: true, name: true } },
          collection: { select: { id: true, name: true, slug: true } },
          tags: true,
          files: {
            select: {
              id: true,
              fileName: true,
              format: true,
              fileSize: true,
              dimensionsX: true,
              dimensionsY: true,
              dimensionsZ: true,
              triangleCount: true,
              isPrimary: true,
              isPrinted: true,
            },
          },
          _count: {
            select: { files: true, assets: true },
          },
        },
      }),
    ]);

    // Converte BigInt em Number/String para segurança de serialização JSON
    const sanitizedModels = models.map((m) => ({
      ...m,
      files: m.files.map((f) => ({
        ...f,
        fileSize: Number(f.fileSize),
      })),
    }));

    return NextResponse.json({
      items: sanitizedModels,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
