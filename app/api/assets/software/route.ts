import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * GET /api/assets/software
 * 자산 목록 조회
 */
export async function GET(req: Request) {
  try {
    const admin = requireAdmin(req);
    console.log("[GET /api/assets/software] Authenticated:", admin.username);

    const items = await prisma.softwareAsset.findMany({
      orderBy: { expiryDate: "asc" },
      include: {
        vendor: true,
        department: true,
      },
    });

    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    if (message === "UNAUTHORIZED") {
      console.log("[GET /api/assets/software] ❌ Unauthorized");
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.error("[GET /api/assets/software] Server error:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/software
 * 자산 생성
 */
export async function POST(req: Request) {
  try {
    const admin = requireAdmin(req);
    console.log("[POST /api/assets/software] Authenticated:", admin.username);

    const body = await req.json();

    // v1 최소 필수값
    const name = String(body?.name ?? "").trim();
    const category = body?.category;
    const expiryDate = body?.expiryDate ? new Date(body.expiryDate) : null;

    if (!name || !category || !expiryDate || isNaN(expiryDate.getTime())) {
      return NextResponse.json(
        { error: "name, category, expiryDate는 필수입니다." },
        { status: 400 }
      );
    }

    const created = await prisma.softwareAsset.create({
      data: {
        name,
        category,
        status: body?.status ?? "active",
        expiryDate,

        ownerAdminId: admin.adminId ?? admin.id,

        vendorId: body?.vendorId ?? null,
        departmentId: body?.departmentId ?? null,

        purchaseDate: body?.purchaseDate
          ? new Date(body.purchaseDate)
          : null,

        seatsTotal: body?.seatsTotal ?? null,
        seatsUsed: body?.seatsUsed ?? null,

        cost: body?.cost ?? null,
        currency: body?.currency ?? "KRW",
        billingCycle: body?.billingCycle ?? "monthly",

        description: body?.description ?? null,
      },
    });

    return NextResponse.json({ item: created }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    if (message === "UNAUTHORIZED") {
      console.log("[POST /api/assets/software] ❌ Unauthorized");
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.error("[POST /api/assets/software] Server error:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
