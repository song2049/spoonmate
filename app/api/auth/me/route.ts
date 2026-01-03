// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  // Authorization 헤더 로깅
  const authHeader = request.headers.get("Authorization");
  console.log("[/api/auth/me] Authorization header:", authHeader ? "present" : "missing");

  // 인증 정보 추출
  const auth = getAuthFromRequest(request);

  if (!auth) {
    console.warn("[/api/auth/me] Authentication failed - no valid token");
    return NextResponse.json(
      { error: "인증이 필요합니다." },
      { status: 401 }
    );
  }

  console.log("[/api/auth/me] Authenticated user:", auth.username);

  return NextResponse.json({
    authenticated: true,
    user: {
      adminId: auth.adminId,
      username: auth.username,
      name: auth.name,
    },
  });
}