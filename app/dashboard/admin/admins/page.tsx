"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { useBrand } from "@/app/components/BrandProvider";

type AdminRole = "SUPER_ADMIN" | "ADMIN";
type AdminPermission = "ASSET_CSV_IMPORT" | "ASSET_TYPE_MANAGE" | "ADMIN_MANAGE";

type MeUser = {
  adminId: number;
  username: string;
  name: string;
  role: AdminRole;
  isActive?: boolean;
  permissions?: AdminPermission[];
};

type Admin = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;

  // ✅ 추가
  permissions: AdminPermission[];
};

const PERMISSIONS: { key: AdminPermission; label: string }[] = [
  { key: "ASSET_CSV_IMPORT", label: "CSV 업로드" },
  { key: "ASSET_TYPE_MANAGE", label: "타입/필드 관리" },
  { key: "ADMIN_MANAGE", label: "관리자 관리" },
];

export default function AdminsPage() {
  const router = useRouter();
  const { brand, setBrand, refresh: refreshBrand } = useBrand();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [pwDraft, setPwDraft] = useState<Record<number, string>>({});
  const [pwSavingId, setPwSavingId] = useState<number | null>(null);
  const [me, setMe] = useState<MeUser | null>(null);
  const [checkingPermission, setCheckingPermission] = useState(true);

  // ✅ 전역 브랜드 설정(사명/로고)
  const [brandName, setBrandName] = useState<string>(brand.companyName);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandPreviewUrl, setBrandPreviewUrl] = useState<string | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    name: "",
    email: "",
    role: "ADMIN" as AdminRole,
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await apiFetch<{ admins: Admin[] }>("/api/admins");
      setAdmins(data.admins);
    } catch (e: any) {
      // ✅ 정확한 에러 메시지 표시
      const errorMessage = e?.message || "관리자 목록을 불러오는데 실패했습니다.";
      console.error("[AdminsPage] Load error:", e);
      alert(`오류: ${errorMessage}`);
      // 여기서 router.push("/dashboard") 같은 처리도 가능
    } finally {
      setLoading(false);
    }
  };

  // ✅ 권한 체크: SUPER_ADMIN 또는 ADMIN_MANAGE 권한이 있어야 접근 가능
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { data } = await apiFetch<{ authenticated: boolean; user: MeUser }>("/api/auth/me");
        const user = data.user;

        // ✅ 권한 체크: SUPER_ADMIN이거나 ADMIN_MANAGE 권한이 있어야 함
        const hasAccess =
          user.role === "SUPER_ADMIN" || user.permissions?.includes("ADMIN_MANAGE");

        if (!hasAccess) {
          // 권한 없음: 대시보드로 리다이렉트
          router.replace("/dashboard");
          return;
        }

        setMe(user);
        setCheckingPermission(false);
        // 권한 확인 후 목록 로드
        await load();
      } catch (e: any) {
        console.error("[AdminsPage] Permission check error:", e);
        // 인증 실패 등은 대시보드로 리다이렉트
        router.replace("/dashboard");
      }
    };

    checkPermission();
  }, [router]);

  // brand context가 갱신되면 입력값도 동기화
  useEffect(() => {
    setBrandName(brand.companyName);
  }, [brand.companyName]);

  useEffect(() => {
    if (!logoFile) {
      setBrandPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setBrandPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const saveBrand = async () => {
    setBrandSaving(true);
    try {
      const fd = new FormData();
      fd.append("companyName", brandName);
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch("/api/brand", {
        method: "PATCH",
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || "브랜드 설정 저장 실패");
      }

      const j = await res.json();
      // ✅ 즉시 전역 반영(헤더/배지)
      setBrand({ companyName: j.companyName, logoUrl: j.logoUrl });
      setLogoFile(null);
      await refreshBrand();
      alert("브랜드 설정이 저장되었습니다.");
    } catch (e: any) {
      alert(e?.message || "브랜드 설정 저장 실패");
    } finally {
      setBrandSaving(false);
    }
  };

  const create = async () => {
    await apiFetch("/api/admins", {
      method: "POST",
      body: JSON.stringify(form),
    });
    setForm({ username: "", password: "", name: "", email: "", role: "ADMIN" });
    await load();
  };

  const updateAdmin = async (id: number, updates: { role?: AdminRole; isActive?: boolean }) => {
    try {
      await apiFetch(`/api/admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "업데이트 실패");
    }
  };

  const updatePassword = async (id: number) => {
    const newPassword = (pwDraft[id] ?? "").trim();
    if (!newPassword) {
      alert("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.length < 8) {
      alert("비밀번호는 8자 이상이어야 합니다.");
      return;
    }

    setPwSavingId(id);
    try {
      await apiFetch(`/api/admins/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ newPassword }),
      });
      setPwDraft((prev) => ({ ...prev, [id]: "" }));
      alert("비밀번호가 변경되었습니다.");
    } catch (e: any) {
      alert(e?.message || "비밀번호 변경 실패");
    } finally {
      setPwSavingId(null);
    }
  };

  const togglePermission = async (id: number, permission: AdminPermission, enabled: boolean) => {
    setSavingId(id);
    try {
      const { data } = await apiFetch<{ success: boolean; adminId: number; permissions: AdminPermission[] }>(
        `/api/admins/${id}/permissions`,
        {
          method: "PATCH",
          body: JSON.stringify({ permission, enabled }),
        }
      );

      // ✅ 전체 reload 대신 해당 행만 즉시 반영
      setAdmins((prev) =>
        prev.map((a) => (a.id === id ? { ...a, permissions: data.permissions } : a))
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "권한 변경 실패");
    } finally {
      setSavingId(null);
    }
  };

  // ✅ 권한 확인 중이거나 로딩 중
  if (checkingPermission || loading) return <div className="p-6">Loading...</div>;

  // ✅ 권한 없음 (이미 리다이렉트되었지만 방어 코드)
  if (!me || (me.role !== "SUPER_ADMIN" && !me.permissions?.includes("ADMIN_MANAGE"))) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-medium">권한이 없습니다.</p>
          <p className="text-sm mt-1">관리자 관리 페이지에 접근할 권한이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">관리자 계정 관리</h1>
        <p className="text-sm text-gray-500">슈퍼관리자 전용</p>
      </div>

      {/* ✅ 브랜드 설정 */}
      <div className="rounded-lg border p-4 space-y-3">
        <div>
          <div className="font-medium">브랜드 설정</div>
          <div className="text-xs text-gray-500 mt-1">
            헤더 로고/사명 및 페이지 상단 배지(예: <span className="font-medium">{brand.companyName} • Asset Ops</span>)에
            즉시 반영됩니다.
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <div className="space-y-2">
            <label className="text-sm font-medium">사명</label>
            <input
              className="border rounded px-3 py-2 w-full"
              placeholder="회사명"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">로고 이미지</label>
            <input
              className="border rounded px-3 py-2 w-full"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            <div className="text-xs text-gray-500">권장: 투명 PNG, 가로형 로고</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded border bg-white px-3 py-2 text-sm flex items-center gap-2">
            <span className="text-gray-500">미리보기:</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={brandPreviewUrl || brand.logoUrl || "/spoonmate.png"}
              alt="logo preview"
              className="h-6 w-auto object-contain"
            />
            <span className="font-medium">{brandName || "(사명)"}</span>
          </div>

          <button
            onClick={saveBrand}
            disabled={brandSaving}
            className="rounded bg-black text-white px-4 py-2 text-sm disabled:opacity-50"
          >
            {brandSaving ? "저장 중..." : "브랜드 저장"}
          </button>
        </div>
      </div>

      {/* 관리자 생성 */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">관리자 생성</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="password"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="border rounded px-3 py-2"
            placeholder="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />

          <select
            className="border rounded px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
          >
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>

        <button onClick={create} className="rounded bg-black text-white px-4 py-2 text-sm">
          생성
        </button>
      </div>

      {/* 관리자 목록 */}
      <div className="rounded-lg border">
        <div className="p-4 border-b font-medium">관리자 목록</div>
        <div className="p-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="py-2 pr-4">ID</th>
                <th className="py-2 pr-4">username</th>
                <th className="py-2 pr-4">name</th>
                <th className="py-2 pr-4">email</th>
                <th className="py-2 pr-4">role</th>
                <th className="py-2 pr-4">상태</th>
                <th className="py-2 pr-4">권한</th>
                <th className="py-2 pr-4">createdAt</th>
                <th className="py-2 pr-4">비밀번호</th>
                <th className="py-2 pr-4">액션</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t align-top">
                  <td className="py-2 pr-4">{a.id}</td>
                  <td className="py-2 pr-4">{a.username}</td>
                  <td className="py-2 pr-4">{a.name}</td>
                  <td className="py-2 pr-4">{a.email}</td>

                  <td className="py-2 pr-4">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={a.role}
                      onChange={(e) => updateAdmin(a.id, { role: e.target.value as AdminRole })}
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </td>

                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        a.isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.isActive ? "활성" : "비활성"}
                    </span>
                  </td>

                  {/* ✅ 권한 토글 */}
                  <td className="py-2 pr-4">
                    <div className="flex flex-col gap-2">
                      {PERMISSIONS.map((p) => {
                        const checked = a.permissions?.includes(p.key);
                        const disabled = savingId === a.id;

                        return (
                          <label key={p.key} className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={(e) => togglePermission(a.id, p.key, e.target.checked)}
                            />
                            <span className="text-xs">{p.label}</span>
                          </label>
                        );
                      })}
                      {savingId === a.id && <div className="text-xs text-gray-500">저장 중...</div>}
                    </div>
                  </td>

                  <td className="py-2 pr-4">{new Date(a.createdAt).toLocaleString()}</td>

                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <input
                        className="border rounded px-2 py-1 text-xs"
                        type="password"
                        placeholder="새 비밀번호(8자+)"
                        value={pwDraft[a.id] ?? ""}
                        onChange={(e) =>
                          setPwDraft((prev) => ({ ...prev, [a.id]: e.target.value }))
                        }
                      />
                      <button
                        onClick={() => updatePassword(a.id)}
                        disabled={pwSavingId === a.id}
                        className="rounded px-2 py-1 text-xs bg-gray-900 text-white disabled:opacity-50"
                      >
                        {pwSavingId === a.id ? "변경 중..." : "변경"}
                      </button>
                    </div>
                    {a.id === me.adminId ? (
                      <div className="mt-1 text-[11px] text-gray-500">
                        * 본인 계정도 비밀번호 변경은 가능합니다.
                      </div>
                    ) : null}
                  </td>

                  <td className="py-2 pr-4">
                    <button
                      onClick={() => updateAdmin(a.id, { isActive: !a.isActive })}
                      className={`rounded px-2 py-1 text-xs ${
                        a.isActive
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-green-50 text-green-700 hover:bg-green-100"
                      }`}
                    >
                      {a.isActive ? "비활성화" : "활성화"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-3 text-xs text-gray-500">
            * 권한은 기능별 토글로 관리됩니다. (CSV 업로드 권한 등)
          </div>
        </div>
      </div>
    </div>
  );
}
