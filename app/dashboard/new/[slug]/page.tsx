"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

type FieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean";

type Field = {
  id: number;
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  optionsJson?: any; // select 옵션: ["A","B"] 또는 [{label,value}]
};

type AssetType = {
  id: number;
  slug: string;
  name: string;
  fields: Field[];
};

function normalizeSelectOptions(optionsJson: any): Array<{ label: string; value: string }> {
  if (!optionsJson) return [];
  if (Array.isArray(optionsJson)) {
    // ["A","B"] or [{label,value}]
    if (optionsJson.length === 0) return [];
    if (typeof optionsJson[0] === "string") {
      return optionsJson.map((v: string) => ({ label: v, value: v }));
    }
    if (typeof optionsJson[0] === "object" && optionsJson[0]) {
      return optionsJson
        .map((o: any) => ({
          label: String(o.label ?? o.value ?? ""),
          value: String(o.value ?? o.label ?? ""),
        }))
        .filter((o: any) => o.label && o.value);
    }
  }
  return [];
}

export default function NewAssetByTypePage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [type, setType] = useState<AssetType | null>(null);
  const [title, setTitle] = useState("");
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ type: AssetType }>(`/api/catalog/types/${slug}`, {
        cache: "no-store",
      });
      setType(data.type);
      // 초기값 세팅(필드 타입에 따라)
      const init: Record<string, any> = {};
      for (const f of data.type.fields ?? []) {
        if (f.fieldType === "boolean") init[f.key] = false;
      }
      setValues(init);
    } catch (e: any) {
      setError(e?.message ?? "폼 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const requiredFields = useMemo(() => {
    return (type?.fields ?? []).filter((f) => f.required);
  }, [type]);

  function setField(key: string, v: any) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function submit() {
    if (!type) return;

    if (!title.trim()) {
      alert("대표명(title)을 입력하세요.");
      return;
    }

    // 프론트 required 검증
    for (const f of requiredFields) {
      const v = values[f.key];
      const empty =
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "");
      if (empty) {
        alert(`필수값: ${f.label}`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        typeSlug: type.slug,
        title: title.trim(),
        data: values,
      };

      const { data } = await apiFetch<{ success: boolean; id: number }>("/api/assets", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      alert(`등록 완료 (id: ${data.id})`);
      router.push("/dashboard"); // 1차 MVP: 대시보드로 복귀
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <h1 className="text-xl font-semibold">등록</h1>
          <p className="text-sm text-gray-500">폼을 불러오는 중 오류가 발생했습니다.</p>
          <div className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={load}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              다시 시도
            </button>
            <button
              onClick={() => router.push("/dashboard/new")}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            >
              유형 선택으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!type) return <div className="p-6">Type not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500">Asset Type</div>
            <h1 className="mt-1 text-xl font-semibold">{type.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              필드 정의에 따라 자동으로 폼이 생성됩니다.
            </p>
          </div>

          <button
            onClick={() => router.push("/dashboard/new")}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            유형 다시 선택
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
        {/* 대표명 */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-800">
            대표명 (title) <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
            placeholder="예: Notion / 노트북 A / 사무용 의자"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="text-xs text-gray-500">리스트/검색용 대표 이름입니다.</div>
        </div>

        {/* 동적 필드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(type.fields ?? []).map((f) => {
            const v = values[f.key];

            // select 옵션
            const options = f.fieldType === "select" ? normalizeSelectOptions(f.optionsJson) : [];

            const label = (
              <label className="text-sm font-medium text-gray-800">
                {f.label} {f.required ? <span className="text-red-500">*</span> : null}
              </label>
            );

            if (f.fieldType === "textarea") {
              return (
                <div key={f.id} className="md:col-span-2 space-y-1">
                  {label}
                  <textarea
                    className="min-h-[96px] w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
                    value={v ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                </div>
              );
            }

            if (f.fieldType === "boolean") {
              return (
                <div key={f.id} className="space-y-1">
                  {label}
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!v}
                      onChange={(e) => setField(f.key, e.target.checked)}
                    />
                    <span className="text-sm text-gray-700">{!!v ? "예" : "아니오"}</span>
                  </div>
                </div>
              );
            }

            if (f.fieldType === "select") {
              return (
                <div key={f.id} className="space-y-1">
                  {label}
                  <select
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
                    value={v ?? ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  >
                    <option value="">선택</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {options.length === 0 && (
                    <div className="text-xs text-amber-700">
                      optionsJson이 비어있습니다. (AssetTypeField.optionsJson 확인)
                    </div>
                  )}
                </div>
              );
            }

            // number/date/text
            const inputType =
              f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text";

            return (
              <div key={f.id} className="space-y-1">
                {label}
                <input
                  type={inputType}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
                  value={
                    inputType === "number"
                      ? (v ?? "")
                      : (v ?? "")
                  }
                  onChange={(e) => {
                    if (inputType === "number") {
                      const val = e.target.value;
                      setField(f.key, val === "" ? "" : Number(val));
                    } else {
                      setField(f.key, e.target.value);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
            disabled={saving}
          >
            취소
          </button>

          <button
            onClick={submit}
            className="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-gray-900 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "저장 중..." : "등록"}
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Tip: 지금은 등록 후 대시보드로 돌아갑니다. 2차 단계에서 “동적 자산 목록/상세” 페이지를 붙이면 완전한 CRUD가 됩니다.
      </div>
    </div>
  );
}
