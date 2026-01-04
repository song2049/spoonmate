import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

function parseId(param: unknown) {
  const n = Number(param);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  try {
    const admin = requireAdmin(req);

    // ✅ Next.js 15: params는 Promise - await 필수
    const resolvedParams = await params;

    const assetId = parseId(resolvedParams.id);
    const assignmentId = parseId(resolvedParams.assignmentId);

    console.log("[PATCH assignments] resolvedParams:", resolvedParams);
    console.log("[PATCH assignments] assetId:", assetId, "assignmentId:", assignmentId);

    if (!assetId || !assignmentId) {
      return NextResponse.json(
        {
          error: "Invalid id",
          detail: {
            assetId,
            assignmentId,
            rawParams: resolvedParams,
          },
        },
        { status: 400 }
      );
    }

    // 자산 소유권 확인
    const asset = await prisma.softwareAsset.findFirst({
      where: { id: assetId, owner: { username: admin.username } },
      select: { id: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    // returnedAt 처리: null이면 반납 취소, 없으면 현재 시간
    const returnedAt =
      body?.returnedAt === null
        ? null
        : body?.returnedAt
          ? new Date(String(body.returnedAt))
          : new Date();

    if (returnedAt !== null && Number.isNaN(returnedAt.getTime())) {
      return NextResponse.json({ error: "Invalid returnedAt" }, { status: 400 });
    }

    const updated = await prisma.assetAssignment.updateMany({
      where: { id: assignmentId, assetId },
      data: { returnedAt },
    });

    if (updated.count === 0) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[PATCH /api/assets/software/[id]/assignments/[assignmentId]] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
