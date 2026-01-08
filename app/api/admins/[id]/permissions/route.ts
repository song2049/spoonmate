import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/requireAdmin";
import type { AdminPermission } from "@prisma/client";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> } // ✅ params가 Promise로 오는 케이스 대응
) {
  try {
    requireSuperAdmin(req);

    const { id } = await ctx.params; // ✅ 여기서 언랩
    const adminId = Number(id);

    if (!Number.isFinite(adminId)) {
      return NextResponse.json({ error: "INVALID_ADMIN_ID" }, { status: 400 });
    }

    const body = await req.json();
    const permission = body?.permission as AdminPermission;
    const enabled = Boolean(body?.enabled);

    if (!permission) {
      return NextResponse.json({ error: "permission 필수" }, { status: 400 });
    }

    if (enabled) {
      await prisma.adminPermissionGrant.upsert({
        where: { adminId_permission: { adminId, permission } },
        update: {},
        create: { adminId, permission },
      });
    } else {
      await prisma.adminPermissionGrant.deleteMany({
        where: { adminId, permission },
      });
    }

    const grants = await prisma.adminPermissionGrant.findMany({
      where: { adminId },
      select: { permission: true },
    });

    return NextResponse.json({
      success: true,
      adminId,
      permissions: grants.map((g) => g.permission),
    });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
