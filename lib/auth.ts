// lib/auth.ts
import jwt from 'jsonwebtoken';

export interface AdminPayload {
  adminId: number;
  username: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Authorization 헤더에서 Bearer 토큰 추출
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) {
    return null;
  }

  // "Bearer <token>" 형식 파싱
  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2) {
    console.warn("[Auth] Invalid Authorization header format");
    return null;
  }

  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== "bearer") {
    console.warn("[Auth] Authorization scheme is not Bearer");
    return null;
  }

  return token;
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
 * Request에서 인증 정보 추출 (헤더 우선, 쿠키 fallback)
 */
export function getTokenFromRequest(request: Request): string | null {
  // 1. Authorization 헤더 확인 (우선)
  const authHeader = request.headers.get("Authorization");
  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    console.log("[Auth] Token from Authorization header");
    return bearerToken;
  }

  // 2. Cookie fallback
  const cookieHeader = request.headers.get("Cookie") || "";
  const match = cookieHeader.match(/auth_token=([^;]+)/);
  if (match) {
    console.log("[Auth] Token from Cookie");
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
    throw new Error('UNAUTHORIZED');
  }

  return admin;
}
