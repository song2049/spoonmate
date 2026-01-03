// lib/requireAdmin.ts
import jwt from "jsonwebtoken";

export interface AdminPayload {
  adminId: number;
  username: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Request 객체에서 쿠키를 파싱하여 auth_token 추출
 */
function getTokenFromCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  return match ? match[1] : null;
}

/**
 * Request 객체에서 Authorization 헤더의 Bearer 토큰 추출
 */
function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }
  return parts[1];
}

/**
 * Request 객체에서 인증 토큰 추출 (Authorization 헤더 우선, Cookie fallback)
 */
function getTokenFromRequest(req: Request): string | null {
  // 1. Authorization 헤더 우선
  const bearerToken = getBearerToken(req);
  if (bearerToken) {
    console.log("[requireAdmin] Token from Authorization header");
    return bearerToken;
  }

  // 2. Cookie fallback
  const cookieToken = getTokenFromCookie(req);
  if (cookieToken) {
    console.log("[requireAdmin] Token from Cookie");
    return cookieToken;
  }

  return null;
}

/**
 * 인증 필수 - Request 객체를 받아 JWT 검증 수행
 * 
 * @param req - Request 객체
 * @returns AdminPayload - 검증된 사용자 정보
 * @throws Error("UNAUTHORIZED") - 인증 실패 시
 */
export function requireAdmin(req: Request): AdminPayload {
  const token = getTokenFromRequest(req);

  if (!token) {
    console.log("[requireAdmin] ❌ No token found");
    throw new Error("UNAUTHORIZED");
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AdminPayload;
    console.log("[requireAdmin] ✅ Token valid for:", payload.username);
    return payload;
  } catch (error) {
    // 서버 로그에 실패 사유 기록
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
