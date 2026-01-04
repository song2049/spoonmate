import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

function parseId(param: unknown) {
  const id = Number(param);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = requireAdmin(req);

    // ✅ Next.js 15: params는 Promise
    const { id: idParam } = await params;
    const assetId = parseId(idParam);

    if (!assetId) {
      return NextResponse.json(
        { error: "Invalid id", detail: { idParam } },
        { status: 400 }
      );
    }

    // 자산 소유권 확인
    const asset = await prisma.softwareAsset.findFirst({
      where: { id: assetId, owner: { username: admin.username } },
      select: { id: true, seatsTotal: true, seatsUsed: true },
    });
    if (!asset) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => ({}));

    const userName = String(body?.userName ?? "").trim();
    const userEmail = String(body?.userEmail ?? "").trim();
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!userName) {
      return NextResponse.json({ error: "userName is required" }, { status: 400 });
    }
    if (!userEmail || !userEmail.includes("@")) {
      return NextResponse.json({ error: "Valid userEmail is required" }, { status: 400 });
    }

    // (선택) 좌석 제한이 있다면 초과 방지
    if (asset.seatsTotal !== null) {
      const activeCount = await prisma.assetAssignment.count({
        where: { assetId, returnedAt: null },
      });
      if (activeCount >= asset.seatsTotal) {
        return NextResponse.json(
          { error: "좌석이 부족합니다. (seatsTotal 초과)" },
          { status: 409 }
        );
      }
    }

    const created = await prisma.assetAssignment.create({
      data: {
        assetId,
        userName,
        userEmail,
        notes,
        assignedAt: new Date(),
        returnedAt: null,
      },
      select: {
        id: true,
        userName: true,
        userEmail: true,
        assignedAt: true,
        returnedAt: true,
        notes: true,
      },
    });

    return NextResponse.json({ assignment: created }, { status: 201 });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[POST /api/assets/software/[id]/assignments] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
