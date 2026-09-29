import { NextResponse } from "next/server";
import { requireOperator, handleAuthError } from "@/lib/auth/session";
import { resetCircuitBreaker } from "@/lib/security/concurrency-limiter";

export async function POST(request: Request) {
  try {
    await requireOperator(request);
    let userId: string | undefined;
    try {
      const body = await request.json();
      if (body.userId) userId = String(body.userId);
    } catch {}

    const result = resetCircuitBreaker(userId);
    return NextResponse.json({
      success: true,
      message: "Circuit Breaker resetado com sucesso",
      unblockedCount: result.unblockedCount,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
