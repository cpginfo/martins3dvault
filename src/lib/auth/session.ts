import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

const JWT_SECRET_STRING = process.env.JWT_SECRET || "printvault-super-secure-key-2026-production";
const SECRET_KEY = new TextEncoder().encode(JWT_SECRET_STRING);
export const COOKIE_NAME = "pv_session";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  avatar?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(user: UserSession): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar: user.avatar || null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(SECRET_KEY);
}

export async function verifySessionToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as "ADMIN" | "EDITOR" | "VIEWER",
      avatar: (payload.avatar as string) || null,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(req?: Request): Promise<UserSession | null> {
  try {
    let token: string | undefined;

    // 1. Check Cookie
    if (req) {
      const cookieHeader = req.headers.get("cookie");
      if (cookieHeader) {
        const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]*)`));
        if (match) token = decodeURIComponent(match[1]);
      }
    }
    if (!token) {
      try {
        const cookieStore = await cookies();
        token = cookieStore.get(COOKIE_NAME)?.value;
      } catch {}
    }

    // 2. Check Authorization Header (Bearer or Basic)
    let authHeader = req?.headers.get("authorization");
    if (!authHeader) {
      try {
        const h = await headers();
        authHeader = h.get("authorization");
      } catch {}
    }

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7).trim();
    }

    if (token) {
      const session = await verifySessionToken(token);
      if (session) return session;
    }

    // 3. Check Basic Auth (email:password)
    if (authHeader?.startsWith("Basic ")) {
      const base64Credentials = authHeader.substring(6).trim();
      const decoded = Buffer.from(base64Credentials, "base64").toString("utf-8");
      const colonIndex = decoded.indexOf(":");
      if (colonIndex !== -1) {
        const email = decoded.substring(0, colonIndex).toLowerCase().trim();
        const password = decoded.substring(colonIndex + 1);
        if (email && password) {
          const user = await prisma.user.findUnique({
            where: { email },
          });
          if (user && (await verifyPassword(password, user.passwordHash))) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role as "ADMIN" | "EDITOR" | "VIEWER",
              avatar: user.avatar,
            };
          }
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

export async function requireAuth(
  allowedRoles?: Array<"ADMIN" | "EDITOR" | "VIEWER">,
  req?: Request
): Promise<UserSession> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requireAdmin(req?: Request): Promise<UserSession> {
  return requireAuth(["ADMIN"], req);
}

export function handleAuthError(err: any): NextResponse | null {
  if (err?.message === "UNAUTHORIZED") {
    return NextResponse.json(
      { error: "Autenticação obrigatória. Forneça login e senha válidos." },
      { status: 401 }
    );
  }
  if (err?.message === "FORBIDDEN") {
    return NextResponse.json(
      { error: "Acesso restrito. Perfil de Administrador obrigatório." },
      { status: 403 }
    );
  }
  return null;
}
