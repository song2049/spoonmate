"use client";

import { useEffect, useState } from "react";
import { fetchSoftwareAssets } from "@/lib/api";

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

export default function DashboardPage() {
  const [items, setItems] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      const data = await fetchSoftwareAssets();
      setItems(data.items);
    } catch (e) {
      setError("자산 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("정말 삭제하시겠습니까?")) return;

    const res = await fetch(`/api/assets/software/${id}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      alert("삭제 실패");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) return <p>로딩 중...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>📦 소프트웨어 자산 관리</h1>

      <table
        border={1}
        cellPadding={8}
        cellSpacing={0}
        style={{ marginTop: 16, width: "100%" }}
      >
        <thead>
          <tr>
            <th>ID</th>
            <th>자산명</th>
            <th>벤더</th>
            <th>부서</th>
            <th>상태</th>
            <th>만료일</th>
            <th>D-day</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          {items.map((a) => {
            const d = daysLeft(a.expiryDate);
            return (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.name}</td>
                <td>{a.vendor?.name ?? "-"}</td>
                <td>{a.department?.name ?? "-"}</td>
                <td>{a.status}</td>
                <td>{a.expiryDate.slice(0, 10)}</td>
                <td
                  style={{
                    color:
                      d < 0 ? "gray" : d <= 30 ? "red" : d <= 90 ? "orange" : "green",
                  }}
                >
                  {d < 0 ? "만료" : `D-${d}`}
                </td>
                <td>
                  <button onClick={() => handleDelete(a.id)}>삭제</button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
