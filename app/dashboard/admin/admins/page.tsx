"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type AdminRole = "SUPER_ADMIN" | "ADMIN";
type Admin = {
  id: number;
  username: string;
  name: string;
  email: string;
  role: AdminRole;
  isActive: boolean;
  createdAt: string;
};

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">관리자 계정 관리</h1>
        <p className="text-sm text-gray-500">슈퍼관리자 전용</p>
      </div>

      <div className="rounded-lg border p-4 space-y-3">
        <div className="font-medium">관리자 생성</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input className="border rounded px-3 py-2" placeholder="username"
            value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="password" type="password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="border rounded px-3 py-2" placeholder="email"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

          <select className="border rounded px-3 py-2"
            value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}>
            <option value="ADMIN">ADMIN</option>
            <option value="SUPER_ADMIN">SUPER_ADMIN</option>
          </select>
        </div>

        <button onClick={create} className="rounded bg-black text-white px-4 py-2 text-sm">
          생성
        </button>
      </div>

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
                <th className="py-2 pr-4">createdAt</th>
                <th className="py-2 pr-4">액션</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2 pr-4">{a.id}</td>
                  <td className="py-2 pr-4">{a.username}</td>
                  <td className="py-2 pr-4">{a.name}</td>
                  <td className="py-2 pr-4">{a.email}</td>
                  <td className="py-2 pr-4">
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={a.role}
                      onChange={(e) =>
                        updateAdmin(a.id, { role: e.target.value as AdminRole })
                      }
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    </select>
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-xs ${
                        a.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {a.isActive ? "활성" : "비활성"}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{new Date(a.createdAt).toLocaleString()}</td>
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
        </div>
      </div>
    </div>
  );
}
