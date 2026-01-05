"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Meta = {
  categories: string[];
  statuses: string[];
  billingCycles: string[];
  currencies: string[];
  vendors: { id: number; name: string }[];
  departments: { id: number; name: string }[];
  purchaseChannels: string[];
};

type Item = {
  id: number;
  name: string;
  category: string;
  status: string;
  expiryDate: string;
  vendor?: { id: number; name: string } | null;
  department?: { id: number; name: string } | null;
  purchaseDate?: string | null;
  cost?: string | null;
  currency?: string;
  billingCycle?: string;
  seatsTotal?: number | null;
  seatsUsed?: number | null;
  description?: string | null;
};

export default function SoftwareAssetEditPage() {
  const router = useRouter();
  const params = useParams();

  // ✅ useParams()로 id 추출
  const id = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    const idStr = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(idStr);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params?.id]);

  const [meta, setMeta] = useState<Meta>({
    categories: [],
    statuses: [],
    billingCycles: [],
    currencies: [],
    vendors: [],
    departments: [],
    purchaseChannels: [],
  });
  const [metaLoading, setMetaLoading] = useState(true);
  const [itemLoading, setItemLoading] = useState(true);

  // 필수 필드
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("");

  // 선택 필드
  const [vendorId, setVendorId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [seatsTotal, setSeatsTotal] = useState<string>("");
  const [seatsUsed, setSeatsUsed] = useState<string>("");
  const [cost, setCost] = useState<string>("0,000");
  const [currency, setCurrency] = useState<string>("KRW");
  const [billingCycle, setBillingCycle] = useState<string>("monthly");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [purchaseChannel, setPurchaseChannel] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ✅ meta 정보 불러오기
  useEffect(() => {
    const run = async () => {
      setMetaLoading(true);
      const res = await fetch("/api/assets/software/meta", {
        credentials: "include",
        cache: "no-store",
      });

      if (res.ok) {
        const data = await res.json();
        setMeta({
          categories: data?.categories ?? [],
          statuses: data?.statuses ?? [],
          billingCycles: data?.billingCycles ?? [],
          currencies: data?.currencies ?? [],
          vendors: data?.vendors ?? [],
          departments: data?.departments ?? [],
          purchaseChannels: data?.purchaseChannels ?? [],
        });
      }
      setMetaLoading(false);
    };
    run();
  }, []);

  // ✅ 기존 자산 데이터 불러오기
  useEffect(() => {
    if (id === null) {
      setError("Invalid id");
      setItemLoading(false);
      return;
    }

    const run = async () => {
      setItemLoading(true);
      setError(null);

      const res = await fetch(`/api/assets/software/${id}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `데이터 로드 실패 (${res.status})`);
        setItemLoading(false);
        return;
      }

      const data = await res.json();
      const item: Item | null = data?.item ?? null;

      if (!item) {
        setError("Not found");
        setItemLoading(false);
        return;
      }

      // 폼에 기존 값 세팅
      setName(item.name ?? "");
      setCategory(item.category ?? "");
      setStatus(item.status ?? "");
      setExpiryDate(item.expiryDate ? item.expiryDate.slice(0, 10) : "");
      setVendorId(item.vendor?.id ? String(item.vendor.id) : "");
      setDepartmentId(item.department?.id ? String(item.department.id) : "");
      setSeatsTotal(item.seatsTotal != null ? String(item.seatsTotal) : "");
      setSeatsUsed(item.seatsUsed != null ? String(item.seatsUsed) : "");
      setCost(item.cost ?? "");
      setCurrency(item.currency ?? "KRW");
      setBillingCycle(item.billingCycle ?? "monthly");
      setPurchaseDate(item.purchaseDate ? item.purchaseDate.slice(0, 10) : "");
      setDescription(item.description ?? "");
      setPurchaseChannel(item.purchaseChannel ?? "");

      setItemLoading(false);
    };

    run();
  }, [id]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (id === null) return;

    setError(null);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      category,
      expiryDate: expiryDate.trim(),
      status,
    };

    // 선택 필드
    payload.vendorId = vendorId ? parseInt(vendorId, 10) : null;
    payload.departmentId = departmentId ? parseInt(departmentId, 10) : null;
    payload.seatsTotal = seatsTotal ? parseInt(seatsTotal, 10) : null;
    payload.seatsUsed = seatsUsed ? parseInt(seatsUsed, 10) : null;
    payload.cost = cost.trim() || null;
    payload.currency = currency || "KRW";
    payload.billingCycle = billingCycle || "monthly";
    payload.purchaseDate = purchaseDate.trim() || null;
    payload.description = description.trim() || null;
    payload.purchaseChannel = purchaseChannel.trim() || null; 
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
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "수정 실패");
      return;
    }

    router.push(`/dashboard/assets/software/${id}`);
    router.refresh();
  };

  const isLoading = metaLoading || itemLoading;

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !name) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">수정</h1>
              <p className="mt-1 text-sm text-gray-500">
                소프트웨어 자산 수정
              </p>
            </div>
            <Link
              href="/dashboard/assets/software"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              목록
            </Link>
          </div>
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-700" />
              SpoonMate • Edit
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              자산 수정
            </h1>
            <p className="mt-1 text-sm text-gray-500">ID #{id} 수정 중</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/assets/software"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              목록
            </Link>
            <Link
              href={`/dashboard/assets/software/${id}`}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              상세
            </Link>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <form onSubmit={onSubmit} className="space-y-5">
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-2">
            <label className="text-sm font-medium">제품명 *</label>
            <input
              className="rounded-md border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: Microsoft 365 E5"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">카테고리 *</label>
              <select
                className="rounded-md border p-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {meta.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">상태</label>
              <select
                className="rounded-md border p-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {meta.statuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">만료일 *</label>
            <input
              type="date"
              className="rounded-md border p-2"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>

          <hr className="my-4 border-gray-200" />
          <p className="text-xs text-gray-500 mb-2">
            아래 항목은 선택 사항입니다.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">벤더</label>
              <select
                className="rounded-md border p-2"
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">선택 안 함</option>
                {meta.vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">부서</label>
              <select
                className="rounded-md border p-2"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">선택 안 함</option>
                {meta.departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">좌석 수 (Total)</label>
              <input
                type="number"
                min={0}
                className="rounded-md border p-2"
                value={seatsTotal}
                onChange={(e) => setSeatsTotal(e.target.value)}
                placeholder="예: 100"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium">사용중 좌석</label>
              <input
                type="number"
                min={0}
                className="rounded-md border p-2"
                value={seatsUsed}
                onChange={(e) => setSeatsUsed(e.target.value)}
                placeholder="예: 50"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* 구매 채널 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">구매 채널</label>
              <input
                type="text"
                className="rounded-md border p-2"
                value={purchaseChannel}
                onChange={(e) => setPurchaseChannel(e.target.value)}
                placeholder="예: 인터넷 구매"
              />
            </div>

            {/* 결제 주기 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">결제 주기</label>
              <select
                className="rounded-md border p-2"
                value={billingCycle}
                onChange={(e) => setBillingCycle(e.target.value)}
              >
                {meta.billingCycles.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* 비용 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">비용</label>
              <input
                type="text"
                className="rounded-md border p-2"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="예: 120000.00"
              />
            </div>

            {/* 통화 */}
            <div className="grid gap-2">
              <label className="text-sm font-medium">통화</label>
              <select
                className="rounded-md border p-2"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                {meta.currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">구매일</label>
            <input
              type="date"
              className="rounded-md border p-2"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">설명</label>
            <textarea
              className="rounded-md border p-2 min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="추가 메모나 설명을 입력하세요"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
            <Link
              href={`/dashboard/assets/software/${id}`}
              className="rounded-md border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              취소
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
