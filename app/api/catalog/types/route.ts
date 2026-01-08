import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

export async function GET(req: Request) {
  try {
    requireAdmin(req);

    const types = await prisma.assetType.findMany({
      where: { isActive: true },
      orderBy: [{ order: "asc" }, { id: "asc" }],
      select: { id: true, slug: true, name: true },
    });

    return NextResponse.json({ types });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
