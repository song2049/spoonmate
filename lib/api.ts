// lib/api.ts
const TOKEN_KEY = "accessToken";

/**
 * 토큰 저장
 */
export function setAccessToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TOKEN_KEY, token);
    console.log("[Auth] Token saved to localStorage");
  }
}

/**
 * 토큰 조회
 */
export function getAccessToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * 토큰 삭제
 */
export function removeAccessToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    console.log("[Auth] Token removed from localStorage");
  }
}

/**
 * 토큰 존재 여부
 */
export function hasAccessToken(): boolean {
  return !!getAccessToken();
}

/**
 * 공통 fetch wrapper - Authorization 헤더 자동 추가
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {}
): Promise<{ data: T; response: Response }> {
  const token = getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Authorization 헤더 자동 추가
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // 요청 로깅
  console.log(`[API Request] ${options.method || "GET"} ${url}`, {
    hasToken: !!token,
    headers: Object.keys(headers),
  });

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include", // 쿠키도 함께 전송 (하이브리드 지원)
  });

  // 응답 로깅
  console.log(`[API Response] ${response.status} ${url}`);

  // 401 처리 - 토큰 만료/무효
  if (response.status === 401) {
    console.warn("[Auth] 401 Unauthorized - removing token");
    removeAccessToken();
    // 로그인 페이지로 리다이렉트 (선택사항)
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

export async function fetchSoftwareAssets() {
  const res = await fetch("/api/assets/software", {
    credentials: "include", // 쿠키 포함
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to fetch assets");
  }

  return res.json();
}
