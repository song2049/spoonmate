"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

type AssetType = { id: number; slug: string; name: string };

type Asset = {
  id: number;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  type: { slug: string; name: string };
  createdBy?: { id: number; username: string; name: string } | null;
};

export default function DynamicAssetsPage() {
  const [types, setTypes] = useState<AssetType[]>([]);
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");

  async function load() {
    setLoading(true);
    try {
      const t = await apiFetch<{ types: AssetType[] }>("/api/catalog/types", { cache: "no-store" });
      setTypes(t.data.types ?? []);

      const qs = new URLSearchParams();
      if (q.trim()) qs.set("q", q.trim());
      if (type) qs.set("type", type);

      const a = await apiFetch<{ assets: Asset[] }>(`/api/assets?${qs.toString()}`, { cache: "no-store" });
      setItems(a.data.assets ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const countByType = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) {
      map.set(it.type.slug, (map.get(it.type.slug) ?? 0) + 1);
    }
    return map;
  }, [items]);

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500">Dynamic Assets</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">자산 목록</h1>
            <p className="mt-1 text-sm text-gray-500">
              동적 등록(AssetEntity) 기반 자산을 조회/관리합니다.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/new"
              className="rounded-full bg-black px-4 py-2 text-sm text-white hover:bg-gray-900"
            >
              새로 등록
            </Link>
            <button
              onClick={load}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              새로고침
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            placeholder="검색 (title)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <select
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">전체 유형</option>
            {types.map((t) => (
              <option key={t.id} value={t.slug}>
                {t.name} ({countByType.get(t.slug) ?? 0})
              </option>
            ))}
          </select>

          <button
            onClick={load}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            필터 적용
          </button>
        </div>
      </div>

      {/* List */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="p-4 border-b font-medium">목록</div>

        {loading ? (
          <div className="p-6 text-sm text-gray-600">Loading...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-gray-600">
            데이터가 없습니다. 상단 “새로 등록”으로 생성해보세요.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="p-3 text-left font-medium">ID</th>
                  <th className="p-3 text-left font-medium">유형</th>
                  <th className="p-3 text-left font-medium">대표명</th>
                  <th className="p-3 text-left font-medium">상태</th>
                  <th className="p-3 text-left font-medium">생성</th>
                  <th className="p-3 text-left font-medium">수정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((it) => (
                  <tr key={it.id} className="hover:bg-gray-50 transition">
                    <td className="p-3 text-gray-700">{it.id}</td>
                    <td className="p-3 text-gray-700">{it.type.name}</td>
                    <td className="p-3">
                      <Link
                        href={`/dashboard/assets/${it.id}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {it.title}
                      </Link>
                      {it.createdBy?.name ? (
                        <div className="text-xs text-gray-500">
                          by {it.createdBy.name}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 text-gray-700">{it.status}</td>
                    <td className="p-3 text-gray-700">
                      {new Date(it.createdAt).toLocaleString()}
                    </td>
                    <td className="p-3 text-gray-700">
                      {new Date(it.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-xs text-gray-500">
        다음 단계: CSV 업로드(타입/필드 키 매핑) + JSON 내부 검색(고급)
      </div>
    </div>
  );
}
