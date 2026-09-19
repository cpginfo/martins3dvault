import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string; fileId: string }> }
) {
  try {
    const { id, fileId } = await props.params;
    const body = await request.json();
    const { isPrinted } = body;

    if (isPrinted === undefined) {
      return NextResponse.json({ error: "Campo isPrinted é obrigatório" }, { status: 400 });
    }

    const updatedFile = await prisma.modelFile.update({
      where: { id: fileId, modelId: id },
      data: { isPrinted: Boolean(isPrinted) },
    });

    return NextResponse.json({
      ...updatedFile,
      fileSize: Number(updatedFile.fileSize),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
