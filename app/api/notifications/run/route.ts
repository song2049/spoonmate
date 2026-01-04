import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

export async function POST(req: Request) {
  try {
    const admin = requireAdmin(req);

    const today = startOfDay(new Date());
    const d7 = addDays(today, 7);
    const d30 = addDays(today, 30);

    // 1) 대상 자산 조회(본인 소유 + active)
    const assets = await prisma.softwareAsset.findMany({
      where: {
        owner: { username: admin.username },
        status: "active",
        expiryDate: { gte: today, lte: d30 },
      },
      orderBy: { expiryDate: "asc" },
    });

    // 2) D-7 / D-30 분류
    const d7Targets = assets.filter((a) => a.expiryDate <= d7);
    const d30Targets = assets; // 이미 d30 범위로 걸었음

    // 3) 오늘 중복 기록 방지: 오늘 기록된 로그 조회
    const already = await prisma.notificationLog.findMany({
      where: {
        asset: { owner: { username: admin.username } },
        sentAt: { gte: today, lt: addDays(today, 1) },
      },
      select: { assetId: true, rule: true },
    });
    const sentSet = new Set(already.map((x) => `${x.assetId}:${x.rule}`));

    // 4) 기록할 로그 생성
    const toCreate: { assetId: number; rule: string }[] = [];

    for (const a of d30Targets) {
      const key = `${a.id}:D30`;
      if (!sentSet.has(key)) toCreate.push({ assetId: a.id, rule: "D30" });
    }
    for (const a of d7Targets) {
      const key = `${a.id}:D7`;
      if (!sentSet.has(key)) toCreate.push({ assetId: a.id, rule: "D7" });
    }

    if (toCreate.length) {
      await prisma.notificationLog.createMany({
        data: toCreate.map((x) => ({ ...x })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json({
      summary: {
        totalCandidates: assets.length,
        d30: d30Targets.length,
        d7: d7Targets.length,
        newlyLogged: toCreate.length,
      },
      candidates: {
        d30: d30Targets.map((a) => ({ id: a.id, name: a.name, expiryDate: a.expiryDate })),
        d7: d7Targets.map((a) => ({ id: a.id, name: a.name, expiryDate: a.expiryDate })),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[POST /api/notifications/run] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
