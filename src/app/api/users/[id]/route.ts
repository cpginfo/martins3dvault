import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError, hashPassword } from "@/lib/auth/session";
import { processAvatar } from "@/lib/users/avatar";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await props.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);
    const { id } = await props.params;

    const body = await request.json();
    const { role, name, email, password, avatar } = body;

    const current = await prisma.user.findUnique({
      where: { id },
    });

    if (!current) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const data: any = {};
    if (role !== undefined) {
      let targetRole = String(role).toUpperCase().trim();
      if (targetRole === "USER" || targetRole === "EDITOR") targetRole = "OPERATOR";
      if (!["ADMIN", "OPERATOR", "VIEWER"].includes(targetRole)) targetRole = "VIEWER";
      data.role = targetRole;
    }
    if (name !== undefined) data.name = name.trim();

    if (email !== undefined && email.trim()) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== current.email) {
        const emailExists = await prisma.user.findUnique({
          where: { email: cleanEmail },
        });
        if (emailExists) {
          return NextResponse.json(
            { error: "Este e-mail já está em uso por outro usuário" },
            { status: 409 }
          );
        }
        data.email = cleanEmail;
      }
    }

    if (password !== undefined && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "A nova senha deve possuir no mínimo 6 caracteres" },
          { status: 400 }
        );
      }
      data.passwordHash = await hashPassword(password);
    }

    if (avatar !== undefined) {
      data.avatar = await processAvatar(avatar, id);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    if (err.code === "P2002") {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(request);
    const { id } = await props.params;

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

    if (currentUser.id === id) {
      return NextResponse.json(
        { error: "Você não pode excluir seu próprio usuário" },
        { status: 400 }
      );
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
