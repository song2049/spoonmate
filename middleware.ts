// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }
  return parts[1];
}

function getTokenFromRequest(request: NextRequest): string | null {
  // 1. Authorization 헤더 우선
  const authHeader = request.headers.get("Authorization");
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    return bearerToken;
  }

  // 2. Cookie fallback
  return request.cookies.get('auth_token')?.value || null;
}

export function middleware(request: NextRequest) {
  const token = getTokenFromRequest(request);
  const hasAuthHeader = !!request.headers.get("Authorization");
  
  console.log("[MW] PATH:", request.nextUrl.pathname, {
    hasToken: !!token,
    source: hasAuthHeader ? "header" : token ? "cookie" : "none",
  });

  // 보호된 경로들
  const protectedPaths = ['/dashboard', '/assets'];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // 보호된 경로인데 토큰 없으면 로그인 페이지로
  if (isProtectedPath && !token) {
    console.log("[MW BLOCKED] No token for protected path:", request.nextUrl.pathname);
    const url = new URL('/login', request.url);
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // 토큰이 있으면 검증
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!);
      console.log("[MW] Token valid for:", (payload as { username?: string }).username);
      
      // 로그인 상태에서 로그인 페이지 접근 시 대시보드로
      if (request.nextUrl.pathname === '/login') {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      // 서버 로그에 실패 사유 기록
      if (error instanceof jwt.TokenExpiredError) {
        console.error("[MW] Token expired at:", error.expiredAt);
      } else if (error instanceof jwt.JsonWebTokenError) {
        console.error("[MW] Invalid token:", error.message);
      } else {
        console.error("[MW] Token verification failed:", error);
      }

      // 토큰이 유효하지 않으면 보호된 경로에서 로그인으로
      if (isProtectedPath) {
        console.log("[MW BLOCKED] Invalid token for protected path:", request.nextUrl.pathname);
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token');
        return response;
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};

export const runtime = "nodejs";