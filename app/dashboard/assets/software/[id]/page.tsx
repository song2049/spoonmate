"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";

type Assignment = {
  id: number;
  userName: string;
  userEmail: string;
  assignedAt: string;
  returnedAt: string | null;
  notes: string | null;
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
  renewalCycle?: string | null;
  autoRenew?: boolean;

  cost?: string | null;
  currency?: string;
  billingCycle?: string;

  seatsTotal?: number | null;
  seatsUsed?: number | null;

  purchaseChannel?: string | null;
  description?: string | null;

  assignments?: Assignment[];
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

  if (Number.isNaN(d)) {
    return (
      <span className="inline-flex rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-700">
        -
      </span>
    );
  }

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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-sm text-gray-900">{value}</div>
    </div>
  );
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-gray-200 bg-gray-50 text-gray-700",
      ].join(" ")}
    >
      {active ? "사용중" : "반납"}
    </span>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      {/* ✅ max-h + overflow 추가 */}
      <div className="relative w-full max-w-lg max-h-[85vh] overflow-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-lg">
        <div className="sticky top-0 bg-white pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-semibold">{title}</h3>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-sm hover:bg-gray-50"
            >
              닫기
            </button>
          </div>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function AssignmentsSection({
  assetId,
  assignments,
  onAdded,
  onReturned,
}: {
  assetId: number;
  assignments: Assignment[];
  onAdded: () => void;
  onReturned: () => void;
}) {
  const total = assignments.length;
  const activeCount = assignments.filter((a) => !a.returnedAt).length;

  const [open, setOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  // ✅ handleSave: 검증 → API 호출 → 성공 시 모달 닫기 + 목록 갱신
  async function handleSave() {
    if (!userName.trim()) {
      alert("사용자명을 입력하세요.");
      return;
    }
    if (!userEmail.trim()) {
      alert("이메일을 입력하세요.");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch(`/api/assets/software/${assetId}/assignments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName,
          userEmail,
          notes: notes.trim() ? notes : null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? "배정 추가 실패");
        return;
      }

      // ✅ 성공 시에만 모달 닫기 + 폼 초기화 + 목록 갱신
      setOpen(false);
      setUserName("");
      setUserEmail("");
      setNotes("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  async function returnAssignment(assignmentId: number) {
    if (!confirm("반납 처리하시겠습니까?")) return;

    const res = await fetch(
      `/api/assets/software/${assetId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnedAt: new Date().toISOString() }),
      }
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? `반납 실패 (${res.status})`);
      return;
    }

    onReturned();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">Assignments 사용자 목록</h2>
          <p className="mt-1 text-sm text-gray-500">
            현재 배정 <span className="font-medium text-gray-900">{activeCount}</span>명 / 누적{" "}
            <span className="font-medium text-gray-900">{total}</span>건
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
        >
          배정 추가
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-gray-500">
            <tr className="border-b border-gray-200">
              <th className="py-2 pr-3">상태</th>
              <th className="py-2 pr-3">사용자</th>
              <th className="py-2 pr-3">이메일</th>
              <th className="py-2 pr-3">배정일</th>
              <th className="py-2 pr-3">반납일</th>
              <th className="py-2 pr-3">비고</th>
              <th className="py-2 pr-3 text-right">액션</th>
            </tr>
          </thead>

          <tbody className="text-gray-900">
            {total === 0 ? (
              <tr>
                <td className="py-8 text-center text-gray-500" colSpan={7}>
                  아직 배정된 사용자가 없습니다.
                </td>
              </tr>
            ) : (
              assignments.map((a) => {
                const isActive = !a.returnedAt;
                return (
                  <tr key={a.id} className="border-b border-gray-100 last:border-b-0">
                    <td className="py-3 pr-3">
                      <StatusBadge active={isActive} />
                    </td>
                    <td className="py-3 pr-3 font-medium">{a.userName}</td>
                    <td className="py-3 pr-3 text-gray-600">{a.userEmail}</td>
                    <td className="py-3 pr-3">{fmtDate(a.assignedAt)}</td>
                    <td className="py-3 pr-3">{fmtDate(a.returnedAt)}</td>
                    <td className="py-3 pr-3 text-gray-600">{a.notes?.trim() ? a.notes : "-"}</td>
                    <td className="py-3 pr-3 text-right">
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => returnAssignment(a.id)}
                          className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                        >
                          반납
                        </button>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} title="배정 추가" onClose={() => !saving && setOpen(false)}>
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-xs text-gray-500">사용자명</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="예: 홍길동"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-500">이메일</div>
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="예: hong@company.com"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-gray-500">비고(선택)</div>
            <textarea
              className="w-full min-h-[88px] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-200"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="예: 마케팅팀 신규 입사자 / 1년 계약"
            />
          </div>

          {/* ✅ CTA 버튼 영역 - 입력 폼 하단, 항상 표시 */}
          <div className="flex items-center justify-end gap-2 pt-4 mt-4 border-t border-gray-200" >
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="
              relative z-10
              rounded-xl border border-gray-300
              bg-black px-4 py-2 text-sm text-white
              transition-colors
              enabled:hover:bg-white enabled:hover:text-black
              disabled:opacity-50
            "
          



            >
              {saving ? "저장중..." : "저장"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default function SoftwareAssetDetailPage() {
  const router = useRouter();
  const params = useParams();

  const id = useMemo(() => {
    const raw = params?.id;
    if (!raw) return null;
    const idStr = Array.isArray(raw) ? raw[0] : raw;
    const n = Number(idStr);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [params?.id]);

  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const seatsText = useMemo(() => {
    if (!item) return "-";
    const used = item.seatsUsed ?? null;
    const total = item.seatsTotal ?? null;
    if (used === null && total === null) return "-";
    if (used !== null && total !== null) return `${used} / ${total}`;
    if (used !== null) return `${used}`;
    return `${total}`;
  }, [item]);

  const assignments = useMemo(() => {
    const list = item?.assignments ?? [];
    return [...list].sort((a, b) => {
      const ad = new Date(a.assignedAt).getTime();
      const bd = new Date(b.assignedAt).getTime();
      return bd - ad;
    });
  }, [item?.assignments]);

  async function load(assetId: number) {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/assets/software/${assetId}`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.error ?? `상세 로드 실패 (${res.status})`);
        setItem(null);
        return;
      }

      const data = await res.json();
      setItem(data?.item ?? null);
    } catch {
      setError("상세 정보를 불러오지 못했습니다.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const res = await fetch(`/api/assets/software/${item.id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? `삭제 실패 (status: ${res.status})`);
      return;
    }

    router.push("/dashboard/assets/software");
    router.refresh();
  }

  useEffect(() => {
    if (id === null) {
      setError("Invalid id");
      setItem(null);
      setLoading(false);
      return;
    }
    load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                <span className="inline-block h-2 w-2 rounded-full bg-gray-700" />
                SpoonMate • Detail
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">상세</h1>
              <p className="mt-1 text-sm text-gray-500">소프트웨어 자산 상세 페이지</p>
            </div>

            <Link
              href="/dashboard/assets/software"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              목록
            </Link>
          </div>

          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error ?? "Not found"}
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
              SpoonMate • Software Asset
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
              <DdayBadge expiryDate={item.expiryDate} />
            </div>

            <p className="mt-1 text-sm text-gray-500">
              ID #{item.id} • 만료일 {item.expiryDate.slice(0, 10)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/assets/software"
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              목록
            </Link>

            <Link
              href={`/dashboard/assets/software/${item.id}/edit`}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              수정
            </Link>

            <button
              onClick={handleDelete}
              className="inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              type="button"
            >
              삭제
            </button>
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-base font-semibold tracking-tight">기본 정보</h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="카테고리" value={item.category} />
          <Field label="상태" value={item.status} />
          <Field label="만료일" value={item.expiryDate.slice(0, 10)} />
          <Field label="벤더" value={item.vendor?.name ?? "-"} />
          <Field label="부서" value={item.department?.name ?? "-"} />
          <Field label="좌석" value={seatsText} />
          <Field label="구매일" value={item.purchaseDate?.slice(0, 10) ?? "-"} />
          <Field label="결제 주기" value={item.billingCycle ?? "-"} />
          <Field label="비용" value={item.cost?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") ?? "-"} />
          <Field label="통화" value={item.currency ?? "-"} />
        </div>

        <div className="mt-6">
          <div className="text-xs text-gray-500">설명</div>
          <div className="mt-1 whitespace-pre-wrap text-sm text-gray-900">
            {item.description ?? "-"}
          </div>
        </div>
      </div>

      {/* Assignments */}
      <AssignmentsSection
        assetId={item.id}
        assignments={assignments}
        onAdded={() => load(item.id)}
        onReturned={() => load(item.id)}
      />
    </div>
  );
}
