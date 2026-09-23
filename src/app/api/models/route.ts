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
    const limitRaw = searchParams.get("limit");
    const isAll = limitRaw === "all" || limitRaw === "0" || limitRaw === "-1";
    const limit = isAll
      ? 10000
      : Math.min(10000, Math.max(1, parseInt(limitRaw || "48")));
    const skip = isAll ? 0 : (page - 1) * limit;
    const polymer = searchParams.get("polymer");

    const andConditions: any[] = [];

    const trimmedQ = q.trim();
    if (trimmedQ) {
      const terms = trimmedQ.split(/\s+/).filter(Boolean);
      for (const term of terms) {
        andConditions.push({
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { folderPath: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
            { collection: { name: { contains: term, mode: "insensitive" } } },
            { library: { name: { contains: term, mode: "insensitive" } } },
            { tags: { some: { name: { contains: term, mode: "insensitive" } } } },
            { files: { some: { fileName: { contains: term, mode: "insensitive" } } } },
          ],
        });
      }
    }

    if (printedParam === "true") {
      andConditions.push({ isPrinted: true });
    } else if (printedParam === "false") {
      andConditions.push({ isPrinted: false });
    }

    if (libraryId) {
      andConditions.push({ libraryId });
    }

    if (collectionId) {
      andConditions.push({ collectionId });
    }

    if (favorite) {
      andConditions.push({ isFavorite: true });
    }

    if (format) {
      andConditions.push({
        files: {
          some: {
            format: format.toUpperCase(),
          },
        },
      });
    }

    if (polymer) {
      andConditions.push({
        OR: [
          { filamentType: { contains: polymer, mode: "insensitive" } },
          { files: { some: { fileName: { contains: polymer, mode: "insensitive" } } } },
        ],
      });
    }

    const where: any = andConditions.length > 0 ? { AND: andConditions } : {};

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
        page: isAll ? 1 : page,
        limit: isAll ? total : limit,
        total,
        totalPages: isAll ? 1 : Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
