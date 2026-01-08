import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const items = await prisma.assetType.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, slug: true, name: true, isActive: true },
  });

  return NextResponse.json({ items });
}
