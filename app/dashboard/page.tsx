"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchSoftwareAssets, apiFetch } from "@/lib/api"; // ✅ apiFetch 추가

type AdminRole = "SUPER_ADMIN" | "ADMIN";
type MeUser = {
  adminId: number;
  username: string;
  name: string;
  role: AdminRole;
};

type Asset = {
  id: number;
  name: string;
  category: string;
  status: string;
  expiryDate: string;
  vendor?: { name: string } | null;
  department?: { name: string } | null;
};

function daysLeft(dateStr: string) {
  const today = new Date();
  const expiry = new Date(dateStr);
  const diff = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diff;
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

function PillButton({
  href,
  children,
  variant = "default",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  const base =
    "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition border";
  const styles =
    variant === "primary"
      ? "bg-black text-white border-black hover:bg-gray-900"
      : "bg-white text-gray-900 border-gray-200 hover:bg-gray-50";
  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "danger" | "warning" | "success";
}) {
  const ring =
    tone === "danger"
      ? "ring-red-100"
      : tone === "warning"
      ? "ring-orange-100"
      : tone === "success"
      ? "ring-green-100"
      : "ring-gray-100";

  const chip =
    tone === "danger"
      ? "bg-red-50 text-red-700"
      : tone === "warning"
      ? "bg-orange-50 text-orange-700"
      : tone === "success"
      ? "bg-green-50 text-green-700"
      : "bg-gray-50 text-gray-700";

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-5 ring-1 ${ring}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{label}</div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${chip}`}>
          Live
        </span>
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ 추가: 로그인 사용자(role) 상태
  const [me, setMe] = useState<MeUser | null>(null);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchSoftwareAssets();
      setItems(data.items);
    } catch {
      setError("자산 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // ✅ 추가: 슈퍼관리자 여부 확인(쿠키 기반 /api/auth/me)
  async function loadMe() {
    try {
      const { data } = await apiFetch<{ authenticated: boolean; user: MeUser }>(
        "/api/auth/me"
      );
      setMe(data.user);
    } catch {
      // 인증 실패/만료 등은 기존 흐름(middleware/apiFetch 401 처리)에 맡김
      setMe(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("정말 삭제하시겠습니까? (관련 로그/배정 정보도 함께 정리됩니다)")) return;

    const res = await fetch(`/api/assets/software/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      alert((data as any)?.error ?? `삭제 실패 (status: ${res.status})`);
      return;
    }

    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  useEffect(() => {
    load();
    loadMe(); // ✅ 추가
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    let exp7 = 0;
    let exp30 = 0;
    let expired = 0;

    for (const a of items) {
      const d = daysLeft(a.expiryDate);
      if (d < 0) expired += 1;
      else if (d <= 7) exp7 += 1;
      else if (d <= 30) exp30 += 1;
    }

    return { total: items.length, exp7, exp30, expired };
  }, [items]);

  const preview = useMemo(() => {
    const sorted = [...items].sort(
      (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
    );
    return sorted.slice(0, 10);
  }, [items]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                SpoonMate
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                자산 현황 요약과 알림을 한 화면에서 관리합니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* ✅ 슈퍼관리자 버튼 (최소 추가) */}
              {me?.role === "SUPER_ADMIN" && (
                <PillButton href="/dashboard/admin/admins">
                  관리자 관리
                </PillButton>
              )}

              <PillButton href="/dashboard/notifications">알림</PillButton>
              <PillButton href="/dashboard/new" variant="primary">
                등록
              </PillButton>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>

          <button
            onClick={load}
            className="mt-4 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Brand header */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              <span className="inline-block h-2 w-2 rounded-full bg-gray-700" />
              SpoonMate • Asset Ops
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight">
              대시보드
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              자산 현황 요약과 만료 알림을 한눈에. 바로 작업으로 이동하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* ✅ 슈퍼관리자 버튼 (최소 추가) */}
            {me?.role === "SUPER_ADMIN" && (
              <PillButton href="/dashboard/admin/admins">
                관리자 관리
              </PillButton>
            )}

            <PillButton href="/dashboard/notifications">알림</PillButton>
            <PillButton href="/dashboard/new" variant="primary">
              등록
            </PillButton>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/assets/software"
            className="group rounded-2xl border border-gray-200 p-5 hover:bg-gray-50 transition"
          >
            <div className="text-xs font-medium text-gray-500">자산 관리</div>
            <div className="mt-1 text-lg font-semibold tracking-tight">
              소프트웨어 자산관리
            </div>
            <div className="mt-2 text-sm text-gray-500">
              목록 조회 · 만료 임박 확인 · 수정/삭제
            </div>
            <div className="mt-4 text-sm font-medium text-gray-900 group-hover:underline">
              열기 →
            </div>
          </Link>

          <Link
            href="/dashboard/notifications"
            className="group rounded-2xl border border-gray-200 p-5 hover:bg-gray-50 transition"
          >
            <div className="text-xs font-medium text-gray-500">알림 센터</div>
            <div className="mt-1 text-lg font-semibold tracking-tight">
              만료 알림 로그
            </div>
            <div className="mt-2 text-sm text-gray-500">
              D-7 / D-30 / 만료 상태를 기록 기반으로 추적
            </div>
            <div className="mt-4 text-sm font-medium text-gray-900 group-hover:underline">
              열기 →
            </div>
          </Link>
        </div>

        {/* ✅ 선택: 슈퍼관리자만 보이는 퀵링크 카드(원하면 유지, 원치 않으면 삭제) */}
        {me?.role === "SUPER_ADMIN" && (
          <div className="mt-4">
            <Link
              href="/dashboard/admin/admins"
              className="group block rounded-2xl border border-gray-200 p-5 hover:bg-gray-50 transition"
            >
              <div className="text-xs font-medium text-gray-500">시스템</div>
              <div className="mt-1 text-lg font-semibold tracking-tight">
                관리자 계정 관리
              </div>
              <div className="mt-2 text-sm text-gray-500">
                관리자 생성 · 권한 관리(슈퍼 전용)
              </div>
              <div className="mt-4 text-sm font-medium text-gray-900 group-hover:underline">
                열기 →
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="전체 자산" value={stats.total} tone="neutral" />
        <StatCard label="D-7 임박" value={stats.exp7} tone="danger" />
        <StatCard label="D-30 예정" value={stats.exp30} tone="warning" />
        <StatCard label="만료" value={stats.expired} tone="neutral" />
      </div>

      {/* Preview table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              소프트웨어 자산 미리보기
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              만료일 기준 상위 10개. 전체 관리는 자산관리에서 진행하세요.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <PillButton href="/dashboard/assets/software">전체 보기</PillButton>
            <PillButton href="/dashboard/assets/software/new" variant="primary">
              소프트웨어 등록
            </PillButton>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="p-3 text-left font-medium">ID</th>
                <th className="p-3 text-left font-medium">자산명</th>
                <th className="p-3 text-left font-medium">벤더</th>
                <th className="p-3 text-left font-medium">부서</th>
                <th className="p-3 text-left font-medium">상태</th>
                <th className="p-3 text-left font-medium">만료일</th>
                <th className="p-3 text-left font-medium">D-day</th>
                <th className="p-3 text-left font-medium">관리</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {preview.length === 0 ? (
                <tr>
                  <td className="p-6 text-gray-500" colSpan={8}>
                    등록된 소프트웨어 자산이 없습니다. 상단의 “소프트웨어 등록”으로
                    시작해보세요.
                  </td>
                </tr>
              ) : (
                preview.map((a) => {
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 transition">
                      <td className="p-3 text-gray-700">{a.id}</td>
                      <td className="p-3">
                        <Link
                          className="font-medium text-gray-900 hover:underline"
                          href={`/dashboard/assets/software/${a.id}`}
                        >
                          {a.name}
                        </Link>
                      </td>
                      <td className="p-3 text-gray-700">{a.vendor?.name ?? "-"}</td>
                      <td className="p-3 text-gray-700">{a.department?.name ?? "-"}</td>
                      <td className="p-3 text-gray-700">{a.status}</td>
                      <td className="p-3 text-gray-700">{a.expiryDate.slice(0, 10)}</td>
                      <td className="p-3">
                        <DdayBadge expiryDate={a.expiryDate} />
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="rounded-full border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer hint */}
      <div className="text-xs text-gray-500">
        Tip: 대시보드는 요약/바로가기, 자산관리는 실무 작업(검색·수정·삭제) 화면으로 분리합니다.
      </div>
    </div>
  );
}
