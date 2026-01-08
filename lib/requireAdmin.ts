// lib/requireAdmin.ts
import jwt from "jsonwebtoken";

export type AdminRole = "SUPER_ADMIN" | "ADMIN";

export interface AdminPayload {
  adminId: number;
  username: string;
  name: string;
  role: AdminRole;
  iat?: number;
  exp?: number;
}

/**
 * Cookie header에서 auth_token 추출
 * (httpOnly 쿠키 단일 소스)
 */
function getTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)auth_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * 인증 필수 - 쿠키(auth_token)에서 JWT 검증
 */
export function requireAdmin(req: Request): AdminPayload {
  const token = getTokenFromCookie(req);

  if (!token) {
    console.log("[requireAdmin] ❌ No auth_token cookie");
    throw new Error("UNAUTHORIZED");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AdminPayload;

    // role이 없는 레거시 토큰 방어(초기 마이그레이션용)
    if (!payload.role) {
      // 기본값을 ADMIN으로 취급하거나, 아예 거절할 수도 있음(권장: 거절)
      console.warn("[requireAdmin] ⚠️ Token has no role - treating as ADMIN");
      (payload as any).role = "ADMIN";
    }

    console.log("[requireAdmin] ✅ Token valid:", {
      username: payload.username,
      role: payload.role,
    });

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      console.error("[requireAdmin] Token expired at:", error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("[requireAdmin] Invalid token:", error.message);
    } else {
      console.error("[requireAdmin] Token verification failed:", error);
    }
    throw new Error("UNAUTHORIZED");
  }
}

/**
 * 슈퍼관리자만 허용
 */
export function requireSuperAdmin(req: Request): AdminPayload {
  const payload = requireAdmin(req);

  if (payload.role !== "SUPER_ADMIN") {
    console.log("[requireSuperAdmin] ❌ Forbidden for:", payload.username);
    throw new Error("FORBIDDEN");
  }

  return payload;
}
