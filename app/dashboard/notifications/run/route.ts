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
    const tomorrow = addDays(today, 1);
    const d7 = addDays(today, 7);
    const d30 = addDays(today, 30);

    // ✅ 오늘 이미 기록된 로그(중복 방지용)
    const already = await prisma.notificationLog.findMany({
      where: {
        sentAt: { gte: today, lt: tomorrow },
        asset: { owner: { username: admin.username } },
      },
      select: { assetId: true, rule: true },
    });
    const sentSet = new Set(already.map((x) => `${x.assetId}:${x.rule}`));

    // ✅ D-30 범위 자산 조회 (active + 본인 소유)
    const assets = await prisma.softwareAsset.findMany({
      where: {
        owner: { username: admin.username },
        status: "active",
        expiryDate: { gte: today, lte: d30 },
      },
      orderBy: { expiryDate: "asc" },
      select: { id: true, name: true, expiryDate: true },
    });

    const d7Targets = assets.filter((a) => new Date(a.expiryDate) <= d7);
    const d30Targets = assets;

    // ✅ 신규 로그 생성 목록
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
        data: toCreate,
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
        d7: d7Targets,
        d30: d30Targets,
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
