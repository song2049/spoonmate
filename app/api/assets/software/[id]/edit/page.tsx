"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Item = {
  id: number;
  name: string;
  category: string;
  status: string;
  expiryDate: string;
  description: string | null;
};

type Meta = {
  categories: string[];
  statuses: string[];
};

export default function Page() {
  const router = useRouter();
  const params = useParams();
  const id = String(params?.id ?? "");

  const [meta, setMeta] = useState<Meta>({ categories: [], statuses: [] });
  const [item, setItem] = useState<Item | null>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setLoading(true);

      // meta + item 병렬
      const [mRes, iRes] = await Promise.all([
        fetch("/api/assets/software/meta", { credentials: "include", cache: "no-store" }),
        fetch(`/api/assets/software/${id}`, { credentials: "include", cache: "no-store" }),
      ]);

      if (!mRes.ok) {
        setLoading(false);
        setError("메타 정보를 불러오지 못했습니다.");
        return;
      }
      if (!iRes.ok) {
        const d = await iRes.json().catch(() => ({}));
        setLoading(false);
        setError(d?.error ?? "자산 정보를 불러오지 못했습니다.");
        return;
      }

      const m = await mRes.json();
      const i = await iRes.json();

      setMeta({
        categories: m?.categories ?? [],
        statuses: m?.statuses ?? [],
      });

      const it = i?.item as Item;
      setItem(it);

      setName(it.name ?? "");
      setCategory(it.category ?? (m?.categories?.[0] ?? ""));
      setStatus(it.status ?? (m?.statuses?.[0] ?? ""));
      setExpiryDate((it.expiryDate ?? "").slice(0, 10));
      setDescription(it.description ?? "");

      setLoading(false);
    };

    if (id) run();
  }, [id]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      name: name.trim(),
      category,
      status,
      expiryDate,
      description: description.trim() ? description : null,
    };

    if (!payload.name || !payload.category || !payload.expiryDate) {
      setError("제품명, 카테고리, 만료일은 필수입니다.");
      return;
    }

    setSaving(true);
    const res = await fetch(`/api/assets/software/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d?.error ?? "수정 실패");
      return;
    }

    router.push("/dashboard/assets/software");
    router.refresh();
  };

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">불러오는 중...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">자산 수정</h1>
          <p className="mt-1 text-sm text-gray-500">ID: {item?.id}</p>
        </div>
        <Link href="/dashboard/assets/software" className="rounded-md border px-3 py-2 text-sm">
          목록으로
        </Link>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={onSave} className="mt-6 space-y-5 max-w-xl">
        <div className="grid gap-2">
          <label className="text-sm font-medium">제품명 *</label>
          <input className="rounded-md border p-2" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">카테고리 *</label>
            <select className="rounded-md border p-2" value={category} onChange={(e) => setCategory(e.target.value)}>
              {meta.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">상태</label>
            <select className="rounded-md border p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
              {meta.statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">만료일 *</label>
          <input type="date" className="rounded-md border p-2" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">설명(비고)</label>
          <textarea
            className="rounded-md border p-2 min-h-[120px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="구매 채널, 계약 조건, 메모 등"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </form>
    </div>
  );
}
