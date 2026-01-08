// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true });

  // 환경 변수로 HTTPS 여부 판단 (EC2 프록시 환경 고려)
  const isHttps = (process.env.NEXTAUTH_URL || "").startsWith("https://");

  // ✅ 쿠키 삭제 - delete와 덮어쓰기 방식 병행
  res.cookies.delete("auth_token");

  // ✅ 환경/브라우저 차이로 남는 케이스 방어 (덮어쓰기 방식)
  res.cookies.set("auth_token", "", {
    httpOnly: true,
    secure: isHttps, // HTTPS 환경에서는 secure 필수
    sameSite: "lax",
    path: "/",
    maxAge: 0, // 즉시 만료
  });

  console.log("[Logout] Cookie cleared, secure:", isHttps);
  return res;
}
