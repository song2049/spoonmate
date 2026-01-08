// app/api/auth/me/route.ts
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  try {
    // ✅ 쿠키(auth_token) 기반 단일 소스 인증
    const auth = requireAdmin(request);

    // ✅ DB에서 isActive 및 permissions 조회
    const admin = await prisma.admin.findUnique({
      where: { id: auth.adminId },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        permissionGrants: {
          select: { permission: true },
        },
      },
    });

    if (!admin) {
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // ✅ permissions 배열로 변환
    const permissions = admin.permissionGrants.map((g) => g.permission);

    return NextResponse.json({
      authenticated: true,
      user: {
        adminId: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role, // ✅ SUPER_ADMIN / ADMIN
        isActive: admin.isActive,
        permissions, // ✅ 권한 배열
      },
    });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
