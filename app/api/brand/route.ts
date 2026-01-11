import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/requireAdmin";
import path from "path";
import fs from "fs/promises";

/**
 * 전역 브랜드 설정
 * - GET  : 인증 없이 조회 가능 (헤더/푸터 공통)
 * - PATCH: SUPER_ADMIN만 수정 가능 (사명 / 로고)
 */

// ======================
// 공통 유틸
// ======================
const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");

async function getBrand() {
  // 단일 row (id=1)
  return prisma.appBrand.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      companyName: "SpoonMate",
    },
  });
}

// ======================
// GET
// ======================
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

// ======================
// PATCH
// ======================
export async function PATCH(req: Request) {
  try {
    // 🔐 권한 체크
    requireSuperAdmin(req);

    const contentType = req.headers.get("content-type") || "";

    let companyName: string | undefined;
    let logoUrl: string | undefined;

    // ======================
    // multipart/form-data
    // ======================
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();

      const name = form.get("companyName");
      if (typeof name === "string") {
        companyName = name.trim();
      }

      const file = form.get("logo") as File | null;

      if (file && file.size > 0) {
        const buffer = Buffer.from(await file.arrayBuffer());

        // 확장자 결정
        const ext = (() => {
          const t = file.type || "";
          if (t.includes("png")) return "png";
          if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
          if (t.includes("webp")) return "webp";
          return "png";
        })();

        // 업로드 디렉토리 보장
        await fs.mkdir(UPLOAD_DIR, { recursive: true });

        const filename = `brand-logo-${Date.now()}.${ext}`;
        const filepath = path.join(UPLOAD_DIR, filename);

        await fs.writeFile(filepath, buffer);

        logoUrl = `/uploads/${filename}`;
      }
    }

    // ======================
    // JSON fallback
    // ======================
    else {
      const body = await req.json();
      if (typeof body?.companyName === "string") {
        companyName = body.companyName.trim();
      }
      if (typeof body?.logoUrl === "string") {
        logoUrl = body.logoUrl;
      }
    }

    // ======================
    // Validation
    // ======================
    if (companyName !== undefined && companyName.length === 0) {
      return NextResponse.json(
        { error: "사명은 비워둘 수 없습니다." },
        { status: 400 }
      );
    }

    // ======================
    // DB Update
    // ======================
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
