"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type AssetType = {
  id: number;
  slug: string;
  name: string;
};

export default function NewAssetHomePage() {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ types: AssetType[] }>("/api/catalog/types", {
        cache: "no-store",
      });
      setTypes(data.types ?? []);
    } catch (e: any) {
      setError(e?.message ?? "타입 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        {/* 좌측 타이틀 */}
        <div>
          <h1 className="text-xl font-semibold">등록</h1>
          <p className="text-sm text-gray-500">등록할 자산 유형을 선택하세요.</p>
        </div>

        {/* 우측 버튼 영역 */}
        <div className="flex gap-2">
          <Link
            href="/dashboard/assets"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            동적 자산 목록 보기
          </Link>

          <button
            onClick={load}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {types.map((t) => (
          <Link
            key={t.id}
            href={`/dashboard/new/${t.slug}`}
            className="group rounded-2xl border border-gray-200 bg-white p-5 hover:bg-gray-50 transition"
          >
            <div className="text-xs text-gray-500">Asset Type</div>
            <div className="mt-1 text-lg font-semibold tracking-tight">
              {t.name}
            </div>
            <div className="mt-3 text-sm text-gray-500">
              선택하면 입력 폼으로 이동합니다.
            </div>
            <div className="mt-4 text-sm font-medium text-gray-900 group-hover:underline">
              선택 →
            </div>
          </Link>
        ))}
      </div>

      {types.length === 0 && !error && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          등록 가능한 유형이 없습니다. seed 또는 AssetType 데이터를 확인하세요.
        </div>
      )}
    </div>
  );
}
