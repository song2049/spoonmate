import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

/**
 * GET /api/assets
 * - 동적 자산(AssetEntity) 목록 조회
 * - query:
 *   - q: title 검색(1차 MVP는 title만)
 *   - type: AssetType.slug 필터
 *   - take: 최대 개수 (기본 200, 최대 500)
 */
export async function GET(req: Request) {
  try {
    requireAdmin(req);

    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim();
    const typeSlug = (url.searchParams.get("type") ?? "").trim();
    const takeParam = Number(url.searchParams.get("take") ?? "200");
    const take = Number.isFinite(takeParam)
      ? Math.min(Math.max(takeParam, 1), 500)
      : 200;

    const where: any = {};

    if (typeSlug) {
      const type = await prisma.assetType.findUnique({
        where: { slug: typeSlug },
        select: { id: true },
      });

      if (!type) {
        return NextResponse.json({ assets: [] });
      }
      where.typeId = type.id;
    }

    if (q) {
      where.OR = [{ title: { contains: q } }];
    }

    const assets = await prisma.assetEntity.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      take,
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        type: { select: { slug: true, name: true } },
        createdBy: { select: { id: true, username: true, name: true } },
      },
    });

    return NextResponse.json({ assets });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/assets
 * - 동적 자산(AssetEntity) 생성
 * - body: { typeSlug, title, data }
 *
 * ✅ 아래 POST는 네가 준 코드와 로직 동일
 */
export async function POST(req: Request) {
  try {
    const me = requireAdmin(req);

    const body = await req.json();
    const { typeSlug, title, data } = body as {
      typeSlug: string;
      title: string;
      data: Record<string, any>;
    };

    if (!typeSlug || !title || !data) {
      return NextResponse.json(
        { error: "필수값이 누락되었습니다." },
        { status: 400 }
      );
    }

    const type = await prisma.assetType.findUnique({
      where: { slug: typeSlug },
      select: { id: true },
    });

    if (!type) {
      return NextResponse.json(
        { error: "타입이 존재하지 않습니다." },
        { status: 404 }
      );
    }

    // required 필드 검증(서버)
    const requiredFields = await prisma.assetTypeField.findMany({
      where: { typeId: type.id, required: true, isActive: true },
      select: { key: true, label: true },
    });

    for (const f of requiredFields) {
      const v = data[f.key];
      const empty =
        v === undefined ||
        v === null ||
        (typeof v === "string" && v.trim() === "");

      if (empty) {
        return NextResponse.json(
          { error: `필수값 누락: ${f.label}` },
          { status: 400 }
        );
      }
    }

    const created = await prisma.assetEntity.create({
      data: {
        typeId: type.id,
        title,
        data,
        createdById: me.adminId,
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: created.id });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json(
        { error: "인증이 필요합니다." },
        { status: 401 }
      );
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
