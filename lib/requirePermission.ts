import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/requireAdmin";
import type { AdminPermission } from "@prisma/client";

export async function requirePermission(req: Request, permission: AdminPermission) {
  // requireAdmin은 "로그인 여부 + adminId 확보"까지만 담당한다고 가정
  const session = requireAdmin(req);
  
  // ✅ 여기서 DB에서 role/isActive를 확정
  const admin = await prisma.admin.findUnique({
    where: { id: session.adminId },
    select: { id: true, role: true, isActive: true },
  });

if (!admin) throw new Error("UNAUTHORIZED");
if (!admin.isActive) throw new Error("FORBIDDEN");

// ✅ SUPER_ADMIN은 모든 권한 자동 허용
if (admin.role === "SUPER_ADMIN") return admin;

// ✅ 일반 ADMIN은 grant 체크
const grant = await prisma.adminPermissionGrant.findFirst({
    where: { adminId: admin.id, permission },
    select: { id: true },
});

  if (!grant) throw new Error("FORBIDDEN");
  return admin;
}
