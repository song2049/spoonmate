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
  optionsJson?: any;
};

type AssetDetail = {
  id: number;
  title: string;
  status: string;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  type: {
    id: number;
    slug: string;
    name: string;
    fields: Field[];
  };
};

function normalizeSelectOptions(optionsJson: any): Array<{ label: string; value: string }> {
  if (!optionsJson) return [];
  if (Array.isArray(optionsJson)) {
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

export default function DynamicAssetDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // editable
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("ACTIVE");
  const [values, setValues] = useState<Record<string, any>>({});

  const requiredFields = useMemo(() => {
    return (asset?.type.fields ?? []).filter((f) => f.required);
  }, [asset]);

  function setField(key: string, v: any) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function load() {
    setLoading(true);
    try {
      const { data } = await apiFetch<{ asset: AssetDetail }>(`/api/assets/${id}`, {
        cache: "no-store",
      });

      setAsset(data.asset);
      setTitle(data.asset.title ?? "");
      setStatus(data.asset.status ?? "ACTIVE");
      setValues(data.asset.data ?? {});
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function save() {
    if (!asset) return;

    if (!title.trim()) {
      alert("대표명(title)을 입력하세요.");
      return;
    }

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
      await apiFetch(`/api/assets/${asset.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: title.trim(),
          status,
          data: values,
        }),
      });

      alert("저장 완료");
      await load();
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!asset) return;
    if (!confirm("정말 삭제하시겠습니까?")) return;

    setSaving(true);
    try {
      await apiFetch(`/api/assets/${asset.id}`, { method: "DELETE" });
      alert("삭제 완료");
      router.push("/dashboard/assets");
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "삭제 실패");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (!asset) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-gray-500">{asset.type.name}</div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              자산 상세
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              id: {asset.id} • 생성: {new Date(asset.createdAt).toLocaleString()} • 수정:{" "}
              {new Date(asset.updatedAt).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard/assets")}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm hover:bg-gray-50"
              disabled={saving}
            >
              목록으로
            </button>

            <button
              onClick={remove}
              className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
              disabled={saving}
            >
              삭제
            </button>

            <button
              onClick={save}
              className="rounded-full bg-black px-5 py-2 text-sm text-white hover:bg-gray-900 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-5">
        {/* title */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-800">
            대표명 (title) <span className="text-red-500">*</span>
          </label>
          <input
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* status */}
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-800">상태(status)</label>
          <select
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="INACTIVE">INACTIVE</option>
            <option value="ON_HOLD">ON_HOLD</option>
            <option value="DISPOSED">DISPOSED</option>
          </select>
          <div className="text-xs text-gray-500">
            1차 MVP는 문자열 status로만 관리합니다.
          </div>
        </div>

        {/* fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {asset.type.fields.map((f) => {
            const v = values[f.key];
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
              const options = normalizeSelectOptions(f.optionsJson);
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

            const inputType =
              f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : "text";

            return (
              <div key={f.id} className="space-y-1">
                {label}
                <input
                  type={inputType}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-100"
                  value={v ?? ""}
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
      </div>

      <div className="text-xs text-gray-500">
        다음 단계: JSON 내부 검색(벤더/부서/만료일 등) + CSV 업로드/다운로드
      </div>
    </div>
  );
}
