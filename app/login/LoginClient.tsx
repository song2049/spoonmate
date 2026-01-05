"use client";

"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setAccessToken } from "@/lib/api";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const nextPath = useMemo(() => sp.get("next") || "/dashboard", [sp]);

  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
	credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "로그인 실패");
      }

      // ✅ 토큰을 localStorage에 저장
      if (data.token) {
        setAccessToken(data.token);
        console.log("[Login] Token received and stored");
      }

      // ✅ 로그인 성공 후 이동
      console.log("[Login] Redirecting to:", nextPath);
      router.push(nextPath);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "로그인 중 오류";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <div className="w-full max-w-md rounded-2xl border p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">SpoonMate Login</h1>
        <p className="text-sm opacity-70 mt-1">
          테스트 계정: <span className="font-mono">admin / admin123</span>
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <input
              className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <button
            className="w-full rounded-xl bg-black text-white py-2 font-medium disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
