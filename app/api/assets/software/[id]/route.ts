import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  AssetCategory,
  AssetStatus,
  RenewalCycle,
  BillingCycle,
  Prisma,
} from "@prisma/client";

function parseId(param: string) {
  const id = Number(param);
  return Number.isFinite(id) ? id : null;
}

function toDate(v: unknown) {
  if (!v) return null;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? null : d;
}

function toInt(v: unknown) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : Math.trunc(n);
}

function toBool(v: unknown) {
  return v === true || v === "true" || v === "on" || v === 1 || v === "1";
}

function parseEnumCI<T extends Record<string, string>>(enm: T, value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const values = Object.values(enm) as string[];
  const hit = values.find((x) => x.toLowerCase() === raw.toLowerCase());
  return (hit ?? null) as T[keyof T] | null;
}

function toDecimal(v: unknown) {
  if (v === undefined || v === null || v === "") return null;
  const s = String(v).trim();
  if (!s) return null;
  return s;
}

// ✅ 단건 조회 (상세 + 사용자 배정 목록 포함)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(_req);
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    // ✅ 모든 ADMIN이 모든 자산 조회 가능 (목록 조회와 동일)
    const item = await prisma.softwareAsset.findFirst({
      where: {
        id,
        // owner 필터 제거 - 모든 ADMIN이 모든 자산 조회 가능
      },
      include: {
        vendor: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },

        // ✅ 여기 추가: 이 소프트웨어를 사용하는 사용자(배정) 목록
        assignments: {
          orderBy: { assignedAt: "desc" },
          select: {
            id: true,
            userName: true,
            userEmail: true,
            assignedAt: true,
            returnedAt: true,
            notes: true,
          },
        },
      },
    });

    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[GET /api/assets/software/[id]] error:", e);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

// ✅ 부분 수정(PATCH)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    // ✅ 모든 ADMIN이 모든 자산 수정 가능 (소유권 확인 제거)
    const exists = await prisma.softwareAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();

    // PATCH: 들어온 값만 반영
    const data: Prisma.SoftwareAssetUpdateInput = {};

    if (body?.name !== undefined) data.name = String(body.name).trim();

    if (body?.category !== undefined) {
      const c = parseEnumCI(AssetCategory, body.category);
      if (!c) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      data.category = c;
    }

    if (body?.status !== undefined) {
      const s = parseEnumCI(AssetStatus, body.status);
      if (!s) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      data.status = s;
    }

    if (body?.expiryDate !== undefined) {
      const d = toDate(body.expiryDate);
      if (!d) return NextResponse.json({ error: "Invalid expiryDate" }, { status: 400 });
      data.expiryDate = d;
    }

    if (body?.vendorId !== undefined) {
      const v = toInt(body.vendorId);
      if (v !== null) data.vendor = { connect: { id: v } };
      // vendorId를 비워서 해제하고 싶으면 아래 라인 사용
      // if (v === null) data.vendor = { disconnect: true };
    }

    if (body?.departmentId !== undefined) {
      const d = toInt(body.departmentId);
      if (d !== null) data.department = { connect: { id: d } };
      // departmentId 해제 필요 시:
      // if (d === null) data.department = { disconnect: true };
    }

    if (body?.purchaseDate !== undefined) data.purchaseDate = toDate(body.purchaseDate);
    if (body?.renewalCycle !== undefined)
      data.renewalCycle = parseEnumCI(RenewalCycle, body.renewalCycle) ?? null;

    if (body?.autoRenew !== undefined) data.autoRenew = toBool(body.autoRenew);

    if (body?.billingCycle !== undefined)
      data.billingCycle = parseEnumCI(BillingCycle, body.billingCycle) ?? undefined;

    if (body?.cost !== undefined) {
      const c = toDecimal(body.cost);
      data.cost = c ? new Prisma.Decimal(c) : null;
    }

    if (body?.currency !== undefined)
      data.currency = String(body.currency || "KRW").trim() || "KRW";

    if (body?.seatsTotal !== undefined) data.seatsTotal = toInt(body.seatsTotal);
    if (body?.seatsUsed !== undefined) data.seatsUsed = toInt(body.seatsUsed);

    if (body?.purchaseChannel !== undefined)
      data.purchaseChannel = body.purchaseChannel ? String(body.purchaseChannel).trim() : null;

    if (body?.description !== undefined)
      data.description = body.description ? String(body.description) : null;

    // 최소 필수값 체크(빈 문자열 방지)
    if (data.name !== undefined && !String(data.name).trim()) {
      return NextResponse.json({ error: "name은 비울 수 없습니다." }, { status: 400 });
    }

    const updated = await prisma.softwareAsset.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[PATCH /api/assets/software/[id]] error:", e);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}

// ✅ 삭제(DELETE) - 참조 테이블 정리 후 삭제
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);
    const { id: idParam } = await params;
    const id = parseId(idParam);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    // ✅ 모든 ADMIN이 모든 자산 수정 가능 (소유권 확인 제거)
    const exists = await prisma.softwareAsset.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!exists) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      // ✅ FK 참조 테이블부터 삭제
      await tx.notificationLog.deleteMany({ where: { assetId: id } });
      await tx.assetAssignment.deleteMany({ where: { assetId: id } });

      // ✅ 마지막에 자산 삭제
      await tx.softwareAsset.delete({ where: { id } });
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    // FK 관련 에러 남으면 메시지 정리
    if (message.includes("P2003") || message.includes("Foreign key constraint")) {
      return NextResponse.json(
        { error: "참조 중인 로그/배정 정보가 있어 삭제할 수 없습니다." },
        { status: 409 }
      );
    }

    console.error("[DELETE /api/assets/software/[id]] error:", e);
    return NextResponse.json(
      { error: "Server error", detail: message },
      { status: 500 }
    );
  }
}
