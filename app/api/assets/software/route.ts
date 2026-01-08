import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import { AssetCategory, AssetStatus, BillingCycle } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function parseEnumCI<T extends Record<string, string>>(enm: T, value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const values = Object.values(enm) as string[];
  const hit = values.find((x) => x.toLowerCase() === raw.toLowerCase());
  return (hit ?? null) as T[keyof T] | null;
}

function toDate(v: unknown) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInt(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? null : n;
}

function toDecimal(v: unknown) {
  if (v === null || v === undefined || v === "") return null;
  const str = String(v).trim();
  if (!str) return null;
  try {
    return new Decimal(str);
  } catch {
    return null;
  }
}

// ✅ 목록 조회 (+ 만료임박 mode 필터 유지)
// ADMIN 및 SUPER_ADMIN 모두 모든 자산 조회 가능 (조회 권한 분리)
export async function GET(req: Request) {
  try {
    const admin = requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode"); // null | exp30 | exp7

    const now = new Date();
    const upper = new Date(now);

    if (mode === "exp7") upper.setDate(upper.getDate() + 7);
    if (mode === "exp30") upper.setDate(upper.getDate() + 30);

    // ✅ 모든 ADMIN이 모든 자산 조회 가능 (role 구분 없음)
    const where: any = {};

    if (mode === "exp7" || mode === "exp30") {
      where.expiryDate = { gte: now, lte: upper };
      where.status = "active";
    }

    const items = await prisma.softwareAsset.findMany({
      where,
      orderBy: { expiryDate: "asc" },
    });

    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[GET /api/assets/software] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}

// ✅ 등록
export async function POST(req: Request) {
  try {
    const admin = requireAdmin(req);
    const body = await req.json();

    // 필수 필드
    const name = String(body?.name ?? "").trim();
    const category = parseEnumCI(AssetCategory, body?.category);
    const status = parseEnumCI(AssetStatus, body?.status) ?? AssetStatus.active;
    const expiryDate = toDate(body?.expiryDate);

    if (!name || !category || !expiryDate) {
      return NextResponse.json(
        { error: "name, category, expiryDate는 필수입니다." },
        { status: 400 }
      );
    }

    // 선택 필드
    const vendorId = toInt(body?.vendorId);
    const departmentId = toInt(body?.departmentId);
    const seatsTotal = toInt(body?.seatsTotal);
    const seatsUsed = toInt(body?.seatsUsed);
    const cost = toDecimal(body?.cost);
    const currency = body?.currency ? String(body.currency).trim() : undefined;
    const billingCycle = parseEnumCI(BillingCycle, body?.billingCycle);
    const purchaseDate = toDate(body?.purchaseDate);
    const purchaseChannel = body?.purchaseChannel ? String(body.purchaseChannel).trim() : undefined;
    const description = body?.description ? String(body.description).trim() : undefined;

    const created = await prisma.softwareAsset.create({
      data: {
        name,
        category,
        status,
        expiryDate,
        owner: { connect: { username: admin.username } },
        // 선택 필드들 (null/undefined는 자동 무시)
        ...(vendorId !== null && { vendor: { connect: { id: vendorId } } }),
        ...(departmentId !== null && { department: { connect: { id: departmentId } } }),
        ...(seatsTotal !== null && { seatsTotal }),
        ...(seatsUsed !== null && { seatsUsed }),
        ...(cost !== null && { cost }),
        ...(currency && { currency }),
        ...(billingCycle && { billingCycle }),
        ...(purchaseDate !== null && { purchaseDate }),
        ...(purchaseChannel && { purchaseChannel }),
        ...(description && { description }),
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[POST /api/assets/software] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
