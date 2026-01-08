// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

type AdminRole = "SUPER_ADMIN" | "ADMIN";

type JwtPayload = {
  adminId: number;
  username: string;
  name: string;
  role?: AdminRole;
  iat?: number;
  exp?: number;
};

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ✅ 쿠키에서만 토큰 추출 (단일 소스)
  const token = request.cookies.get("auth_token")?.value || null;

  // 보호 경로 (로그인 필요)
  const protectedPaths = ["/dashboard", "/assets"];

  // 슈퍼관리자 전용 경로
  const superOnlyPaths = ["/dashboard/admin"]; // 예: 관리자 관리 페이지들

  const isProtectedPath = protectedPaths.some((p) => pathname.startsWith(p));
  const isSuperOnlyPath = superOnlyPaths.some((p) => pathname.startsWith(p));

  console.log("[MW] PATH:", pathname, {
    hasToken: !!token,
    source: token ? "cookie" : "none",
  });

  // 1) 보호된 경로인데 토큰 없으면 로그인
  if ((isProtectedPath || isSuperOnlyPath) && !token) {
    console.log("[MW BLOCKED] No token:", pathname);
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // 2) 토큰 있으면 검증 + 권한 체크
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

      const role: AdminRole = payload.role ?? "ADMIN"; // 레거시 토큰 방어

      console.log("[MW] Token valid:", { username: payload.username, role });

      // ✅ 슈퍼전용 경로 접근 차단
      if (isSuperOnlyPath && role !== "SUPER_ADMIN") {
        console.log("[MW BLOCKED] Forbidden (need SUPER_ADMIN):", pathname);
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      }

      // ✅ 로그인 상태에서 /login 접근하면 /dashboard로
      if (pathname === "/login") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    } catch (error) {
      // 토큰 검증 실패
      if (error instanceof jwt.TokenExpiredError) {
        console.error("[MW] Token expired at:", error.expiredAt);
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.error("[MW] Invalid token:", error.message);
      } else {
        console.error("[MW] Token verification failed:", error);
      }

      // 유효하지 않은 토큰이면 쿠키 삭제
      // 보호된 경로면 로그인으로
      if (isProtectedPath || isSuperOnlyPath) {
        console.log("[MW BLOCKED] Invalid token on protected path:", pathname);
        const res = NextResponse.redirect(new URL("/login", request.url));
        res.cookies.delete("auth_token");
        return res;
      }

      // /login 접근 시 유효하지 않은 토큰은 삭제하고 로그인 페이지 유지
      if (pathname === "/login") {
        const res = NextResponse.next();
        res.cookies.delete("auth_token");
        return res;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

export const runtime = "nodejs";
