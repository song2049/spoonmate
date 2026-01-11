import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin, requireSuperAdmin } from "@/lib/requireAdmin";
import path from "path";
import fs from "fs/promises";

/**
 * ✅ 전역 브랜드 설정
 * - GET: 인증된 사용자면 누구나 조회 가능 (헤더/배지 공통 사용)
 * - PATCH: SUPER_ADMIN만 수정 가능 (사명/로고)
 */

async function getBrand() {
  // 단일 row(id=1)
  return prisma.appBrand.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, companyName: "SpoonMate" },
  });
}

export async function GET() {
  try {
    const brand = await getBrand();
    return NextResponse.json({
      companyName: brand.companyName,
      logoUrl: brand.logoUrl,
      updatedAt: brand.updatedAt,
    });
  } catch (e) {
    console.error("[GET /api/brand] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


export async function PATCH(req: Request) {
  try {
    requireSuperAdmin(req);

    const contentType = req.headers.get("content-type") || "";

    let companyName: string | undefined;
    let logoUrl: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const name = form.get("companyName");
      if (typeof name === "string") companyName = name.trim();

      const file = form.get("logo") as File | null;
      if (file && typeof file.arrayBuffer === "function" && file.size > 0) {
        const bytes = Buffer.from(await file.arrayBuffer());
        const ext = (() => {
          const t = file.type || "";
          if (t.includes("png")) return "png";
          if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
          if (t.includes("webp")) return "webp";
          return "png"; // fallback
        })();

        const uploadsDir = path.join(process.cwd(), "public", "uploads");
        await fs.mkdir(uploadsDir, { recursive: true });

        const filename = `brand-logo-${Date.now()}.${ext}`;
        const filepath = path.join(uploadsDir, filename);
        await fs.writeFile(filepath, bytes);

        logoUrl = `/uploads/${filename}`;
      }
    } else {
      // JSON fallback
      const body = await req.json();
      if (typeof body?.companyName === "string") companyName = body.companyName.trim();
      if (typeof body?.logoUrl === "string") logoUrl = body.logoUrl;
    }

    if (companyName !== undefined && companyName.length === 0) {
      return NextResponse.json({ error: "사명은 비워둘 수 없습니다." }, { status: 400 });
    }

    const current = await getBrand();
    const updated = await prisma.appBrand.update({
      where: { id: 1 },
      data: {
        companyName: companyName ?? current.companyName,
        logoUrl: logoUrl ?? current.logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      companyName: updated.companyName,
      logoUrl: updated.logoUrl,
      updatedAt: updated.updatedAt,
    });
  } catch (e: any) {
    const message = e instanceof Error ? e.message : "Server error";
    if (message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    console.error("[PATCH /api/brand] error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
