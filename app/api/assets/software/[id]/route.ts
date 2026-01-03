import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

function parseId(idParam: string) {
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

/**
 * GET /api/assets/software/[id]
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(req);

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json(
        { error: "잘못된 ID입니다." },
        { status: 400 }
      );
    }

    const item = await prisma.softwareAsset.findUnique({
      where: { id },
      include: {
        vendor: true,
        department: true,
        assignments: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "자산을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    return NextResponse.json({ item });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.error("[GET /api/assets/software/:id] Server error:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assets/software/[id]
 */
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(req);

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json(
        { error: "잘못된 ID입니다." },
        { status: 400 }
      );
    }

    const body = await req.json();

    const updated = await prisma.softwareAsset.update({
      where: { id },
      data: {
        name: body?.name ?? undefined,
        category: body?.category ?? undefined,
        status: body?.status ?? undefined,
        expiryDate: body?.expiryDate
          ? new Date(body.expiryDate)
          : undefined,

        vendorId: body?.vendorId ?? undefined,
        departmentId: body?.departmentId ?? undefined,

        seatsTotal: body?.seatsTotal ?? undefined,
        seatsUsed: body?.seatsUsed ?? undefined,

        cost: body?.cost ?? undefined,
        currency: body?.currency ?? undefined,
        billingCycle: body?.billingCycle ?? undefined,

        description: body?.description ?? undefined,
      },
    });

    return NextResponse.json({ item: updated });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.error("[PATCH /api/assets/software/:id] Server error:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/assets/software/[id]
 */
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    requireAdmin(req);

    const id = parseId(params.id);
    if (!id) {
      return NextResponse.json(
        { error: "잘못된 ID입니다." },
        { status: 400 }
      );
    }

    await prisma.softwareAsset.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    console.error("[DELETE /api/assets/software/:id] Server error:", e);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
