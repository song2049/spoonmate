import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/requireAdmin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const me = requireSuperAdmin(req);

    // ✅ Next.js 15+ params는 Promise, 이전 버전은 객체
    const resolvedParams = params instanceof Promise ? await params : params;
    const id = Number(resolvedParams.id);
    if (!Number.isFinite(id) || id <= 0) {
      return NextResponse.json({ error: "잘못된 id" }, { status: 400 });
    }

    const body = await req.json();
    const { role, isActive } = body as {
      role?: "SUPER_ADMIN" | "ADMIN";
      isActive?: boolean;
    };

    // ✅ 자기 자신 변경 제한(운영 안정장치)
    if (me.adminId === id) {
      return NextResponse.json(
        { error: "본인 계정은 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (e: any) {
    const msg = e?.message ?? "Server error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "인증 필요" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "권한 없음" }, { status: 403 });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
