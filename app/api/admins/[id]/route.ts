import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/requireAdmin";
import bcrypt from "bcrypt";

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
    const { role, isActive, newPassword } = body as {
      role?: "SUPER_ADMIN" | "ADMIN";
      isActive?: boolean;
      newPassword?: string;
    };

    // ✅ 자기 자신 변경 제한(운영 안정장치)
    // - role/isActive는 본인 변경 금지
    // - 비밀번호는 SUPER_ADMIN이면 본인 포함 변경 가능(운영/복구 편의)
    if (me.adminId === id && (role || typeof isActive === "boolean")) {
      return NextResponse.json(
        { error: "본인 계정의 권한/활성 상태는 변경할 수 없습니다." },
        { status: 400 }
      );
    }

    // ✅ 비밀번호 변경(관리자 화면에서 리셋)
    let passwordHash: string | null = null;
    if (typeof newPassword === "string") {
      const pw = newPassword.trim();
      if (pw.length < 8) {
        return NextResponse.json(
          { error: "비밀번호는 8자 이상이어야 합니다." },
          { status: 400 }
        );
      }
      passwordHash = await bcrypt.hash(pw, 10);
    }

    const updated = await prisma.admin.update({
      where: { id },
      data: {
        ...(role ? { role } : {}),
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(passwordHash ? { password: passwordHash } : {}),
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
