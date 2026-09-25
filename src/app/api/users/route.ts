import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requireAdmin, handleAuthError, hashPassword } from "@/lib/auth/session";
import { processAvatar } from "@/lib/users/avatar";

export async function GET(request: Request) {
  try {
    await requireAdmin(request);

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin(request);

    const { name, email, password, role, avatar } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nome, e-mail e senha são obrigatórios" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "A senha deve conter no mínimo 6 caracteres" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return NextResponse.json({ error: "E-mail já cadastrado no sistema" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const avatarUrl = await processAvatar(avatar, cleanEmail.replace(/[^a-z0-9]/g, "_"));

    let targetRole = (role || "VIEWER").toUpperCase().trim();
    if (targetRole === "USER" || targetRole === "EDITOR") {
      targetRole = "OPERATOR";
    }
    if (!["ADMIN", "OPERATOR", "VIEWER"].includes(targetRole)) {
      targetRole = "VIEWER";
    }

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: targetRole,
        avatar: avatarUrl,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    if (err.code === "P2002") {
      return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin(request);

    const body = await request.json();
    const { id, role, name, email, password, avatar } = body;

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

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
          return NextResponse.json({ error: "Este e-mail já está em uso por outro usuário" }, { status: 409 });
        }
        data.email = cleanEmail;
      }
    }

    if (password !== undefined && password.trim()) {
      if (password.length < 6) {
        return NextResponse.json({ error: "A nova senha deve possuir no mínimo 6 caracteres" }, { status: 400 });
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

export async function DELETE(request: Request) {
  try {
    const currentUser = await requireAdmin(request);

    const { searchParams } = new URL(request.url);
    let id = searchParams.get("id");

    if (!id) {
      try {
        const body = await request.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: "ID do usuário é obrigatório" }, { status: 400 });
    }

    if (currentUser.id === id) {
      return NextResponse.json({ error: "Você não pode excluir seu próprio usuário" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
