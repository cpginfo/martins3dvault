import { NextResponse } from "next/server";
import { requireAdmin, requireAuth, handleAuthError } from "@/lib/auth/session";
import { getCacheStats, clearCache } from "@/lib/storage/cache-ops";

export async function GET(request: Request) {
  try {
    await requireAuth(undefined, request);
    const stats = await getCacheStats();
    return NextResponse.json(stats);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdmin(request);
    const result = await clearCache();
    return NextResponse.json(result);
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
