// prisma/reset-admin.ts
// Admin 비밀번호 재설정 스크립트
// 실행: npx tsx prisma/reset-admin.ts

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.admin.update({
    where: { username: "admin" },
    data: { password: hashedPassword },
  });

  console.log("✅ admin 비밀번호를 admin123로 변경 완료");
  console.log("   사용자:", admin.username);
}

main()
  .catch((e) => {
    console.error("❌ 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
