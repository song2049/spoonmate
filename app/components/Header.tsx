"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect } from "react";

export default function Header() {
  const router = useRouter();
  const isLoggingOut = useRef(false);

  // ✅ 일회성: 기존 localStorage 토큰 정리 (쿠키 단일 소스 마이그레이션)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const oldToken = localStorage.getItem("accessToken");
      if (oldToken) {
        localStorage.removeItem("accessToken");
        console.log("[Migration] Removed legacy localStorage token");
      }
    }
  }, []);

  const handleLogout = async () => {
    // ✅ 중복 실행 방지
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include", // 쿠키 전송
      });

      // ✅ 하드 리로드로 확실하게 세션 초기화
      // router.replace는 클라이언트 캐시가 남아있을 수 있어 window.location 사용
      window.location.href = "/login";
    } catch (error) {
      console.error("로그아웃 오류:", error);
      // 에러가 나도 로그인 페이지로 이동 (하드 리로드)
      window.location.href = "/login";
    }
    // finally에서 isLoggingOut.current = false 하지 않음
    // window.location.href로 페이지가 완전히 리로드되므로 불필요
  };

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 px-6 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/spoonmate.png"
            alt="SpoonMate Logo"
            width={100}
            height={0}
            className="object-contain"
          />
          <span className="text-lg font-semibold tracking-tight text-gray-900">
            SpoonMate
          </span>
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}
