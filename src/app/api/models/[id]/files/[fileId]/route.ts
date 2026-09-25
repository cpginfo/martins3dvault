import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireOperator, handleAuthError } from "@/lib/auth/session";

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    await requireOperator(request);

    const { id, fileId } = await props.params;
    const body = await request.json();
    const { isPrinted, dimensionsX, dimensionsY, dimensionsZ, triangleCount } = body;

    const dataToUpdate: Record<string, any> = {};
    if (isPrinted !== undefined) dataToUpdate.isPrinted = Boolean(isPrinted);
    if (dimensionsX !== undefined && !isNaN(Number(dimensionsX))) dataToUpdate.dimensionsX = Number(dimensionsX);
    if (dimensionsY !== undefined && !isNaN(Number(dimensionsY))) dataToUpdate.dimensionsY = Number(dimensionsY);
    if (dimensionsZ !== undefined && !isNaN(Number(dimensionsZ))) dataToUpdate.dimensionsZ = Number(dimensionsZ);
    if (triangleCount !== undefined && !isNaN(Number(triangleCount))) dataToUpdate.triangleCount = Number(triangleCount);

    if (Object.keys(dataToUpdate).length === 0) {
      return NextResponse.json({ error: "Nenhum dado válido para atualizar" }, { status: 400 });
    }

    const updatedFile = await prisma.modelFile.update({
      where: { id: fileId, modelId: id },
      data: dataToUpdate,
    });

    return NextResponse.json({
      ...updatedFile,
      fileSize: Number(updatedFile.fileSize),
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
