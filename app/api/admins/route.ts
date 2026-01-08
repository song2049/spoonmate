import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/requireAdmin";
import bcrypt from "bcrypt";
import { requirePermission } from "@/lib/requirePermission";

export async function GET(req: Request) {
  try {
    await requirePermission(req, "ADMIN_MANAGE"); // ✅ 접근권한 기반

    const admins = await prisma.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,

        // ✅ 추가: 권한(기능 제한) 목록
        permissionGrants: {
          select: { permission: true },
        },
      },
    });

    // ✅ 프론트 편의: permissions 배열로 내려주기
    const normalized = admins.map((a) => ({
      id: a.id,
      username: a.username,
      name: a.name,
      email: a.email,
      role: a.role,
      isActive: a.isActive,
      createdAt: a.createdAt,
      permissions: a.permissionGrants.map((p) => p.permission),
    }));

    return NextResponse.json({ admins: normalized });
  } catch (e: any) {
    // ✅ 전체 에러 스택 출력
    console.error("[GET /api/admins] Full error:", e);
    console.error("[GET /api/admins] Error stack:", e?.stack);
    
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    requireSuperAdmin(req);

    const body = await req.json();
    const { username, password, name, email, role } = body as {
      username: string;
      password: string;
      name: string;
      email: string;
      role?: "ADMIN" | "SUPER_ADMIN";
    };

    if (!username || !password || !name || !email) {
      return NextResponse.json({ error: "필수값 누락" }, { status: 400 });
    }

    const exists = await prisma.admin.findUnique({ where: { username } });
    if (exists) return NextResponse.json({ error: "이미 존재하는 username" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.admin.create({
      data: {
        username,
        password: passwordHash,
        name,
        email,
        role: role ?? "ADMIN",
      },
      select: { id: true, username: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json({ success: true, admin: created });
  } catch (e: any) {
    // ✅ 전체 에러 스택 출력
    console.error("[POST /api/admins] Full error:", e);
    console.error("[POST /api/admins] Error stack:", e?.stack);
    
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
