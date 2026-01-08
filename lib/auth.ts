// lib/auth.ts
import jwt from "jsonwebtoken";

// ============================================================
// 🔒 쿠키 기반 인증 유틸리티 (단일 소스)
// ============================================================
// Authorization 헤더 로직 제거 - httpOnly 쿠키(auth_token)만 사용
// ============================================================

export interface AdminPayload {
  adminId: number;
  username: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT 토큰 검증 및 payload 반환
 */
export function verifyToken(token: string): AdminPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AdminPayload;
    return decoded;
  } catch (error) {
    // 서버 로그에만 상세 사유 기록
    if (error instanceof jwt.TokenExpiredError) {
      console.error("[Auth] Token expired at:", error.expiredAt);
    } else if (error instanceof jwt.JsonWebTokenError) {
      console.error("[Auth] Invalid token:", error.message);
    } else {
      console.error("[Auth] Token verification failed:", error);
    }
    return null;
  }
}

/**
 * Request에서 쿠키 토큰 추출 (쿠키 단일 소스)
 */
export function getTokenFromRequest(request: Request): string | null {
  // ✅ Cookie에서만 토큰 추출 (단일 소스)
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (match) {
    return match[1];
  }

  return null;
}

/**
 * Request에서 인증된 사용자 정보 추출
 */
export function getAuthFromRequest(request: Request): AdminPayload | null {
  const token = getTokenFromRequest(request);
  if (!token) {
    return null;
  }
  return verifyToken(token);
}

/**
 * Request 객체를 받아 인증된 관리자 정보 반환
 * @throws Error("UNAUTHORIZED") - 인증 실패 시
 */
export function requireAuth(request: Request): AdminPayload {
  const admin = getAuthFromRequest(request);

  if (!admin) {
    throw new Error("UNAUTHORIZED");
  }

  return admin;
}
