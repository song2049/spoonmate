import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";

function toIntId(raw: unknown): number | null {
  // params.id가 string | string[] | undefined 등으로 오는 케이스 방어
  const s = Array.isArray(raw) ? raw[0] : raw;
  if (typeof s !== "string") return null;
  const n = Number(s);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

// ✅ Next 버전에 따라 params가 Promise일 수도 있어서 방어
async function getIdFromParams(ctx: any): Promise<number | null> {
  const p = await ctx?.params;
  return toIntId(p?.id);
}

export async function GET(req: Request, ctx: any) {
  try {
    requireAdmin(req);

    const id = await getIdFromParams(ctx);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const asset = await prisma.assetEntity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        data: true,
        createdAt: true,
        updatedAt: true,
        type: {
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
        },
        createdBy: { select: { id: true, username: true, name: true } },
      },
    });

    if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ asset });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request, ctx: any) {
  try {
    requireAdmin(req);

    const id = await getIdFromParams(ctx);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    const body = await req.json();
    const { title, status, data } = body as {
      title?: string;
      status?: string;
      data?: Record<string, any>;
    };

    if (title !== undefined && !String(title).trim()) {
      return NextResponse.json(
        { error: "대표명(title)은 비워둘 수 없습니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.assetEntity.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title: String(title).trim() } : {}),
        ...(status !== undefined ? { status: String(status) } : {}),
        ...(data !== undefined ? { data } : {}),
      },
      select: { id: true },
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    if (String(msg).includes("Record to update not found")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: Request, ctx: any) {
  try {
    requireAdmin(req);

    const id = await getIdFromParams(ctx);
    if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

    await prisma.assetEntity.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED")
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

    if (String(msg).includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
