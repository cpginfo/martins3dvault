import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

// Rotas públicas que não exigem autenticação prévia
const PUBLIC_API_ROUTES = ["/api/auth/login", "/api/auth/logout", "/api/health", "/api/version"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exceções públicas de API
  if (PUBLIC_API_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // 2. Proteção de Endpoints de API (/api/*)
  if (pathname.startsWith("/api/")) {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json(
        { error: "Autenticação obrigatória. Forneça login e senha válidos." },
        { status: 401 }
      );
    }

    // Regra estrita: Somente usuários admin podem criar e gerenciar outros usuários
    if (pathname.startsWith("/api/users") && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Acesso restrito. Somente administradores podem criar e gerenciar usuários." },
        { status: 403 }
      );
    }

    return NextResponse.next();
  }

  // 3. Tela de Login (/login)
  if (pathname === "/login") {
    const user = await getCurrentUser(request);
    if (user) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 4. Páginas exclusivas de Administrador (/users)
  if (pathname.startsWith("/users")) {
    const user = await getCurrentUser(request);
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }
    if (user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // 5. Demais páginas web do sistema (exigem login)
  const user = await getCurrentUser(request);
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export default proxy;

export const config = {
  matcher: [
    /*
     * Intercepta todas as rotas exceto:
     * - _next/static (arquivos estáticos compilados)
     * - _next/image (otimização de imagens)
     * - favicon.ico, logo.png, avatar.png e outros arquivos de mídia públicos na pasta /public
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|avatar.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
