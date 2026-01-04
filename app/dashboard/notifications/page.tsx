"use client";

import { useState } from "react";

export default function Page() {
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setError(null);
    setLoading(true);

    const res = await fetch("/api/notifications/run", {
      method: "POST",
      credentials: "include",
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "실행 실패");
      return;
    }

    const data = await res.json();
    setResult(data);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold">알림 실행</h1>
      <p className="mt-1 text-sm text-gray-500">
        D-30 / D-7 대상 계산 후 NotificationLog에 기록합니다. (중복 방지)
      </p>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        onClick={run}
        disabled={loading}
        className="mt-4 rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "실행 중..." : "지금 실행"}
      </button>

      {result && (
        <div className="mt-6 space-y-4">
          <div className="rounded-md border p-4 text-sm">
            <div>총 후보: {result.summary.totalCandidates}</div>
            <div>D-30: {result.summary.d30}</div>
            <div>D-7: {result.summary.d7}</div>
            <div>신규 기록: {result.summary.newlyLogged}</div>
          </div>

          <div className="rounded-md border p-4">
            <h2 className="font-medium">D-7 대상</h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {result.candidates.d7.map((x: any) => (
                <li key={x.id}>
                  {x.name} ({String(x.expiryDate).slice(0, 10)})
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-md border p-4">
            <h2 className="font-medium">D-30 대상</h2>
            <ul className="mt-2 list-disc pl-5 text-sm">
              {result.candidates.d30.map((x: any) => (
                <li key={x.id}>
                  {x.name} ({String(x.expiryDate).slice(0, 10)})
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
