// lib/api.ts
// ============================================================
// 🔒 쿠키 기반 인증 전용 API 유틸리티
// ============================================================
// ⚠️ localStorage 토큰 로직은 완전 제거됨
// httpOnly 쿠키(auth_token)만 사용하여 인증 처리
// ============================================================

/**
 * 공통 fetch wrapper - 쿠키 기반 인증 전용
 * 
 * - credentials: "include"로 쿠키 자동 전송
 * - Authorization 헤더는 사용하지 않음 (쿠키 단일 소스)
 * - 401 응답 시 /login으로 리다이렉트
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T; response: Response }> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // 요청 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV === "development") {
    console.log(`[API Request] ${options.method || "GET"} ${url}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // httpOnly 쿠키 자동 전송
  });

  // 응답 로깅 (개발 환경에서만)
  if (process.env.NODE_ENV === "development") {
    console.log(`[API Response] ${response.status} ${url}`);
  }

  // 401 처리 - 로그인 페이지로 리다이렉트
  if (response.status === 401) {
    console.warn("[Auth] 401 Unauthorized - session expired");
    if (typeof window !== "undefined" && !url.includes("/auth/login")) {
      window.location.href = "/login";
    }
  }

  const data = await response.json().catch(() => ({} as T));

  if (!response.ok) {
    throw new Error((data as { error?: string })?.error || `HTTP ${response.status}`);
  }

  return { data, response };
}

/**
 * 소프트웨어 자산 목록 조회
 * apiFetch 기반으로 통일하여 401 처리 및 쿠키 인증 흐름 보장
 */
export async function fetchSoftwareAssets(mode?: "exp7" | "exp30") {
  const url = mode ? `/api/assets/software?mode=${mode}` : "/api/assets/software";
  const { data } = await apiFetch<{ items: any[] }>(url, {
    cache: "no-store",
  });
  return data;
}
