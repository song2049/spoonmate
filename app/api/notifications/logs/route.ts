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

export async function GET(req: Request) {
  try {
    const admin = requireAdmin(req);

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") ?? "today"; // today | week

    const today = startOfDay(new Date());
    const from = range === "week" ? addDays(today, -7) : today;

    const items = await prisma.notificationLog.findMany({
      where: {
        sentAt: { gte: from },
        asset: { owner: { username: admin.username } },
      },
      orderBy: { sentAt: "desc" },
      include: {
        asset: {
          select: { id: true, name: true, category: true, status: true, expiryDate: true },
        },
      },
      take: 200,
    });

    return NextResponse.json({ items });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[GET /api/notifications/logs] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
