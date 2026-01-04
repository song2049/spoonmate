"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Meta = {
  categories: string[];
  statuses: string[];
  billingCycles: string[];
  currencies: string[];
  vendors: { id: number; name: string }[];
  departments: { id: number; name: string }[];
};

export default function SoftwareAssetForm() {
  const router = useRouter();

  const [meta, setMeta] = useState<Meta>({
    categories: [],
    statuses: [],
    billingCycles: [],
    currencies: [],
    vendors: [],
    departments: [],
  });
  const [metaError, setMetaError] = useState<string | null>(null);

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
  const [cost, setCost] = useState<string>("");
  const [currency, setCurrency] = useState<string>("KRW");
  const [billingCycle, setBillingCycle] = useState<string>("monthly");
  const [purchaseDate, setPurchaseDate] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ enum 목록 불러오기
  useEffect(() => {
    const run = async () => {
      setMetaError(null);

      const res = await fetch("/api/assets/software/meta", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        setMetaError("카테고리/상태 목록을 불러오지 못했습니다.");
        return;
      }

      const data = await res.json();
      const categories = data?.categories ?? [];
      const statuses = data?.statuses ?? [];
      const billingCycles = data?.billingCycles ?? [];
      const currencies = data?.currencies ?? [];
      const vendors = data?.vendors ?? [];
      const departments = data?.departments ?? [];

      setMeta({ categories, statuses, billingCycles, currencies, vendors, departments });

      // 기본 선택값 세팅
      setCategory(categories[0] ?? "");
      setStatus(statuses[0] ?? "");
      setCurrency(currencies[0] ?? "KRW");
      setBillingCycle(billingCycles[0] ?? "monthly");
    };

    run();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: Record<string, unknown> = {
      name: name.trim(),
      category,
      expiryDate: expiryDate.trim(),
      status,
    };

    // 선택 필드들 (빈값은 전송 안 함)
    if (vendorId) payload.vendorId = parseInt(vendorId, 10);
    if (departmentId) payload.departmentId = parseInt(departmentId, 10);
    if (seatsTotal) payload.seatsTotal = parseInt(seatsTotal, 10);
    if (seatsUsed) payload.seatsUsed = parseInt(seatsUsed, 10);
    if (cost) payload.cost = cost.trim();
    if (currency) payload.currency = currency;
    if (billingCycle) payload.billingCycle = billingCycle;
    if (purchaseDate) payload.purchaseDate = purchaseDate.trim();
    if (description.trim()) payload.description = description.trim();

    if (!payload.name || !payload.category || !payload.expiryDate) {
      setError("제품명, 카테고리, 만료일은 필수입니다.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/assets/software", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data?.error ?? "등록 실패");
      return;
    }

    router.push("/dashboard/assets/software");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {(metaError || error) && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {metaError ?? error}
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
            disabled={meta.categories.length === 0}
          >
            {meta.categories.length === 0 ? (
              <option value="">불러오는 중...</option>
            ) : (
              meta.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">상태</label>
          <select
            className="rounded-md border p-2"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={meta.statuses.length === 0}
          >
            {meta.statuses.length === 0 ? (
              <option value="">불러오는 중...</option>
            ) : (
              meta.statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))
            )}
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

      {/* ── 추가 필드 (선택) ── */}
      <hr className="my-4 border-gray-200" />
      <p className="text-xs text-gray-500 mb-2">아래 항목은 선택 사항입니다.</p>

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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

      <button
        type="submit"
        disabled={loading || meta.categories.length === 0}
        className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-60"
      >
        {loading ? "등록 중..." : "등록"}
      </button>
    </form>
  );
}
