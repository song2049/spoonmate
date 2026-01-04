"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type LogItem = {
  id: number;
  rule: string; // "D7" | "D30"
  sentAt: string;
  asset: {
    id: number;
    name: string;
    category: string;
    status: string;
    expiryDate: string;
  };
};

function fmt(d: string) {
  return new Date(d).toISOString().slice(0, 19).replace("T", " ");
}

export default function Page() {
  const router = useRouter();
  const sp = useSearchParams();
  const range = (sp.get("range") ?? "today") as "today" | "week";

  const [items, setItems] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setRange = (next: "today" | "week") => {
    const url =
      next === "today"
        ? "/dashboard/notifications/logs"
        : "/dashboard/notifications/logs?range=week";
    router.push(url);
  };

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);

      const url =
        range === "week"
          ? "/api/notifications/logs?range=week"
          : "/api/notifications/logs";

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      setLoading(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `조회 실패 (${res.status})`);
        return;
      }

      const data = await res.json();
      setItems(data?.items ?? []);
    };

    run();
  }, [range]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">알림 로그</h1>
          <p className="mt-1 text-sm text-gray-500">
            알림 실행 결과가 기록된 로그입니다. (중복 발송 방지 근거)
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/notifications"
            className="rounded-md border px-3 py-2 text-sm"
          >
            알림 실행
          </Link>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => setRange("today")}
          className={`rounded-md border px-3 py-1 text-sm ${range === "today" ? "bg-black text-white" : ""}`}
        >
          오늘
        </button>
        <button
          onClick={() => setRange("week")}
          className={`rounded-md border px-3 py-1 text-sm ${range === "week" ? "bg-black text-white" : ""}`}
        >
          최근 7일
        </button>
      </div>

      <div className="mt-6">
        {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">기록시간</th>
                  <th className="p-3 text-left">룰</th>
                  <th className="p-3 text-left">자산명</th>
                  <th className="p-3 text-left">카테고리</th>
                  <th className="p-3 text-left">상태</th>
                  <th className="p-3 text-left">만료일</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-3 text-gray-500">
                      로그가 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((x) => (
                    <tr key={x.id} className="border-t">
                      <td className="p-3">{fmt(x.sentAt)}</td>
                      <td className="p-3">
                        <span className="rounded-full border px-2 py-0.5 text-xs">
                          {x.rule}
                        </span>
                      </td>
                      <td className="p-3">{x.asset.name}</td>
                      <td className="p-3">{x.asset.category}</td>
                      <td className="p-3">{x.asset.status}</td>
                      <td className="p-3">{x.asset.expiryDate.slice(0, 10)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
