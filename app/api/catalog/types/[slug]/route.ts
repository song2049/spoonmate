import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

type Ctx = {
  params: Promise<{ slug: string }>;
};

export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    requireAdmin(req);

    const { slug } = await params;

    // 기존 방어 로직 유지
    if (!slug || slug === "types") {
      return NextResponse.json(
        { error: "slug param missing" },
        { status: 400 }
      );
    }

    const type = await prisma.assetType.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        fields: {
          where: { isActive: true },
          orderBy: [{ order: "asc" }, { id: "asc" }],
          select: {
            id: true,
            key: true,
            label: true,
            fieldType: true,
            required: true,
            optionsJson: true,
          },
        },
      },
    });

    if (!type) {
      return NextResponse.json(
        { error: `타입을 찾을 수 없습니다: ${slug}` },
        { status: 404 }
      );
    }

    return NextResponse.json({ type });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Server error";

    if (msg === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
