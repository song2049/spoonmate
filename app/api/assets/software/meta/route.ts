import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import {
  AssetCategory,
  AssetStatus,
  RenewalCycle,
  BillingCycle,
} from "@prisma/client";

export async function GET(req: Request) {
  try {
    requireAdmin(req);

    const [vendors, departments] = await Promise.all([
      prisma.vendor.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.department.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      categories: Object.values(AssetCategory),
      statuses: Object.values(AssetStatus),
      renewalCycles: Object.values(RenewalCycle),
      billingCycles: Object.values(BillingCycle),
      vendors,
      departments,
      currencies: ["KRW", "USD", "EUR", "JPY"], // 일단 고정
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    console.error("[GET /api/assets/software/meta] error:", e);
    return NextResponse.json({ error: "Server error", detail: message }, { status: 500 });
  }
}
