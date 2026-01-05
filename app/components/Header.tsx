"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { removeAccessToken } from "@/lib/api";

export default function Header() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // 로그아웃 API 호출
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      // localStorage에서 토큰 제거
      removeAccessToken();

      // 로그인 페이지로 리다이렉트
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("로그아웃 오류:", error);
      // 오류가 발생해도 토큰 제거 및 리다이렉트
      removeAccessToken();
      router.push("/login");
    }
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
          onClick={handleLogout}
          className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}

