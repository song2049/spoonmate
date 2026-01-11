"use client";

"use client";

import Link from "next/link";
import BrandBadge from "@/app/components/BrandBadge";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type SoftwareAsset = {
  id: number;
  name: string;
  category: string;
  status: string;
  expiryDate: string;
};

function daysLeft(expiryDate: string) {
  const end = new Date(expiryDate);
  const now = new Date();
  end.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diff = end.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function DdayBadge({ expiryDate }: { expiryDate: string }) {
  const d = daysLeft(expiryDate);

  if (d < 0) {
    return (
      <span className="inline-flex rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
        만료됨
      </span>
    );
  }

  const cls =
    d <= 7
      ? "border-red-300 bg-red-50 text-red-700"
      : d <= 30
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-gray-200 bg-gray-50 text-gray-700";

  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${cls}`}>
      D-{d}
    </span>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full border px-4 py-2 text-sm transition",
        active
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50",
      ].join(" ")}
      type="button"
    >
      {children}
    </button>
  );
}

export default function SoftwareAssetsClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const tab = (sp.get("tab") ?? "all") as "all" | "exp30" | "exp7";

  const mode = useMemo(() => {
    if (tab === "exp30") return "exp30";
    if (tab === "exp7") return "exp7";
    return null;
  }, [tab]);

  const [items, setItems] = useState<SoftwareAsset[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const setTab = (next: "all" | "exp30" | "exp7") => {
    const url =
      next === "all"
        ? "/dashboard/assets/software"
        : `/dashboard/assets/software?tab=${next}`;
    router.push(url);
  };

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);

      const url = mode ? `/api/assets/software?mode=${mode}` : "/api/assets/software";
      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      setLoading(false);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `목록 로드 실패 (${res.status})`);
        return;
      }

      const data = await res.json();
      setItems(data?.items ?? []);
    };

    run();
  }, [mode]);

  return (
    <div className="p-6 space-y-6">
      {/* ✅ 헤더 카드 (대시보드 톤과 통일) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <BrandBadge suffix="Software Assets" />

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              소프트웨어 자산
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              만료일 기준으로 정렬되며, D-30 / D-7 임박을 빠르게 확인할 수 있어요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href= "/" 
            className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >메인가기</Link>
            <Link
              href="/dashboard/notifications"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              알림 조회
            </Link>

            <Link
              href="/dashboard/assets/software/new"
              className="inline-flex items-center rounded-full border border-black bg-black px-4 py-2 text-sm text-white hover:bg-gray-900"
            >
              등록
            </Link>
          </div>
        </div>

        {/* ✅ 탭 (필터 기능 유지) */}
        <div className="mt-6 flex flex-wrap gap-2">
          <TabButton active={tab === "all"} onClick={() => setTab("all")}>
            전체
          </TabButton>
          <TabButton active={tab === "exp30"} onClick={() => setTab("exp30")}>
            D-30 임박
          </TabButton>
          <TabButton active={tab === "exp7"} onClick={() => setTab("exp7")}>
            D-7 임박
          </TabButton>
        </div>
      </div>

      {/* ✅ 상태 영역 */}
      {loading && <p className="text-sm text-gray-500">불러오는 중...</p>}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ✅ 테이블 */}
      {!loading && !error && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3 text-left font-medium">제품명</th>
                  <th className="p-3 text-left font-medium">카테고리</th>
                  <th className="p-3 text-left font-medium">상태</th>
                  <th className="p-3 text-left font-medium">만료일</th>
                  <th className="p-3 text-left font-medium">D-day</th>
                  <th className="p-3 text-left font-medium">액션</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td className="p-6 text-gray-500" colSpan={6}>
                      표시할 자산이 없습니다.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50 transition">
                      <td className="p-3">
                        <Link
                          href={`/dashboard/assets/software/${it.id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {it.name}
                        </Link>
                      </td>
                      <td className="p-3 text-gray-700">{it.category}</td>
                      <td className="p-3 text-gray-700">{it.status}</td>
                      <td className="p-3 text-gray-700">{it.expiryDate.slice(0, 10)}</td>
                      <td className="p-3">
                        <DdayBadge expiryDate={it.expiryDate} />
                      </td>
                      <td className="p-3">
                        <Link
                          className="text-sm text-gray-900 hover:underline"
                          href={`/dashboard/assets/software/${it.id}`}
                        >
                          상세
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
