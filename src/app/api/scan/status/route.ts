import { NextResponse } from "next/server";
import { getScanProgress } from "@/lib/scanner/scan-progress";
import { requireAuth, handleAuthError } from "@/lib/auth/session";

export async function GET(request: Request) {
  try {
    await requireAuth(undefined, request);
    const progress = getScanProgress();
    return NextResponse.json({
      success: true,
      isScanning: progress.isScanning,
      progress,
    });
  } catch (err: any) {
    const authRes = handleAuthError(err);
    if (authRes) return authRes;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
