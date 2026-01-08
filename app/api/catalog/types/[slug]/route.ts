import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

function extractSlugFromUrl(url: string) {
  // 예: http://localhost:3000/api/catalog/types/software_generic?x=1
  const u = new URL(url);
  const parts = u.pathname.split("/").filter(Boolean);
  // ["api","catalog","types","software_generic"]
  return parts[parts.length - 1] || null;
}

export async function GET(
  req: Request,
  ctx: { params?: { slug?: string } }
) {
  try {
    requireAdmin(req);

    const slug = ctx?.params?.slug ?? extractSlugFromUrl(req.url);

    console.log("[types/[slug]] ctx.params:", ctx?.params, "slug:", slug);

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
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
