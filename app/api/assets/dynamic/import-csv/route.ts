import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parse } from "csv-parse/sync";
import { requirePermission } from "@/lib/requirePermission";
import type { AdminPermission } from "@prisma/client";

// import { requireAdmin } from "@/lib/requireAdmin"; // 이미 있으면 사용

type FieldType = "text" | "textarea" | "number" | "date" | "select" | "boolean";

function normalizeHeaderKey(s: string) {
  return String(s ?? "").trim();
}

function toStringOrNull(v: any) {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function parseNumberOrNull(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseDateOrNull(v: any) {
  const s = String(v ?? "").trim();
  if (!s) return null;
  // YYYY-MM-DD 권장
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10); // data JSON에는 문자열로 저장 추천
}

function parseBooleanOrNull(v: any) {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (["true", "1", "y", "yes", "o"].includes(s)) return true;
  if (["false", "0", "n", "no", "x"].includes(s)) return false;
  return null;
}

/**
 * select 타입이면 optionsJson에 ["A","B"] or [{"label":"A","value":"A"}] 같은 형태로 들어올 수 있음
 */
function isAllowedSelectValue(value: string, optionsJson: any): boolean {
  if (!optionsJson) return true; // 옵션 미정이면 일단 허용
  if (Array.isArray(optionsJson)) {
    if (optionsJson.length === 0) return true;
    // string array
    if (typeof optionsJson[0] === "string") return optionsJson.includes(value);
    // object array
    if (typeof optionsJson[0] === "object") {
      return optionsJson.some((o) => String(o?.value) === value);
    }
  }
  return true;
}

export async function POST(req: Request) {
  try {
    await requirePermission(req, "ASSET_CSV_IMPORT");
    // ✅ 관리자만 허용하려면 아래 사용
    // const admin = requireAdmin(req);

    const formData = await req.formData();
    const typeSlug = String(formData.get("typeSlug") ?? "").trim();
    const file = formData.get("file");

    if (!typeSlug) {
      return NextResponse.json({ error: "typeSlug가 필요합니다." }, { status: 400 });
    }
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "file이 없습니다." }, { status: 400 });
    }

    // 1) AssetType + fields 로드
    const type = await prisma.assetType.findUnique({
      where: { slug: typeSlug },
      include: {
        fields: {
          where: { isActive: true },
          orderBy: [{ order: "asc" }, { id: "asc" }],
        },
      },
    });

    if (!type) {
      return NextResponse.json({ error: `존재하지 않는 typeSlug: ${typeSlug}` }, { status: 404 });
    }

    const csvText = await file.text();

    // 2) CSV 파싱
    const records: any[] = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const errors: Array<{ row: number; field?: string; reason: string }> = [];
    const rowsToCreate: Array<{
      typeId: number;
      title: string;
      status: string;
      data: any;
      createdById?: number | null;
      source: "CSV";
    }> = [];

    // 3) row 단위 검증/변환
    records.forEach((rawRow, idx) => {
      const rowNo = idx + 2; // 헤더 다음 줄이 2번째 행

      // 예약 컬럼: title, status
      const title = toStringOrNull(rawRow.title) ?? toStringOrNull(rawRow.name);
      const status = (toStringOrNull(rawRow.status) ?? "ACTIVE").toUpperCase();

      if (!title) {
        errors.push({ row: rowNo, field: "title", reason: "title(또는 name) 필수" });
        return;
      }

      const data: any = {};

      for (const f of type.fields) {
        const key = normalizeHeaderKey(f.key);
        const fieldType = f.fieldType as FieldType;

        const rawValue = rawRow[key];

        // required 체크
        const rawStr = String(rawValue ?? "").trim();
        if (f.required && !rawStr) {
          errors.push({ row: rowNo, field: key, reason: "필수값 누락" });
          return;
        }

        // 값이 비어있으면 스킵(저장도 안 함)
        if (!rawStr) continue;

        // 타입 변환
        if (fieldType === "text" || fieldType === "textarea") {
          data[key] = rawStr;
        } else if (fieldType === "number") {
          const n = parseNumberOrNull(rawStr);
          if (n === null) {
            errors.push({ row: rowNo, field: key, reason: "number 형식이 아님" });
            return;
          }
          data[key] = n;
        } else if (fieldType === "date") {
          const d = parseDateOrNull(rawStr);
          if (d === null) {
            errors.push({ row: rowNo, field: key, reason: "date 형식이 잘못됨 (YYYY-MM-DD)" });
            return;
          }
          data[key] = d; // JSON에 ISO-Date string 저장
        } else if (fieldType === "boolean") {
          const b = parseBooleanOrNull(rawStr);
          if (b === null) {
            errors.push({ row: rowNo, field: key, reason: "boolean 형식이 아님 (true/false, 1/0 등)" });
            return;
          }
          data[key] = b;
        } else if (fieldType === "select") {
          const v = rawStr;
          if (!isAllowedSelectValue(v, f.optionsJson)) {
            errors.push({ row: rowNo, field: key, reason: "select 옵션에 없는 값" });
            return;
          }
          data[key] = v;
        }
      }

      rowsToCreate.push({
        typeId: type.id,
        title,
        status,
        data,
        // createdById: admin?.id ?? null, // requireAdmin 쓰면 활성화
        createdById: null,
        source: "CSV",
      });
    });

    // 4) Insert (부분 성공 허용: 정상 row만)
    if (rowsToCreate.length > 0) {
      await prisma.assetEntity.createMany({
        data: rowsToCreate,
      });
    }

    return NextResponse.json({
      typeSlug,
      successCount: rowsToCreate.length,
      failCount: errors.length,
      errors,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Server error" }, { status: 500 });
  }
}
