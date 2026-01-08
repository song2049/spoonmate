// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(request: Request) {
  try {
    // ✅ 쿠키(auth_token) 기반 단일 소스 인증
    const auth = requireAdmin(request);

    return NextResponse.json({
      authenticated: true,
      user: {
        adminId: auth.adminId,
        username: auth.username,
        name: auth.name,
        role: auth.role, // ✅ SUPER_ADMIN / ADMIN
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
