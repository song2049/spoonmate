// prisma/seed.ts
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  /**
   * 1. 관리자(Admin) 생성
   */
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.admin.upsert({
    where: { username: "admin" },
    update: {
      password: hashedPassword,
      name: "관리자",
      email: "admin@spoonmate.com",
    },
    create: {
      username: "admin",
      password: hashedPassword,
      name: "관리자",
      email: "admin@spoonmate.com",
    },
  });

  console.log("✅ 관리자 생성:", admin.username);

  /**
   * 2. 부서 생성 (중복 방지: upsert)
   */
  const departments = await Promise.all([
    prisma.department.upsert({
      where: { name: "IT팀" },
      update: {},
      create: { name: "IT팀" },
    }),
    prisma.department.upsert({
      where: { name: "총무팀" },
      update: {},
      create: { name: "총무팀" },
    }),
    prisma.department.upsert({
      where: { name: "개발팀" },
      update: {},
      create: { name: "개발팀" },
    }),
    prisma.department.upsert({
      where: { name: "영업팀" },
      update: {},
      create: { name: "영업팀" },
    }),
  ]);

  console.log("✅ 부서 생성 완료");

  /**
   * 3. 벤더(Vendor) 생성
   */
  const vendorNames = ["Microsoft", "Adobe", "Slack", "Zoom", "안랩"];

  const vendors = await Promise.all(
    vendorNames.map((name) =>
      prisma.vendor.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  const vendorMap = new Map<string, number>();
  vendors.forEach((v) => vendorMap.set(v.name, v.id));

  console.log("✅ 벤더 생성 완료");

  /**
   * 4. 소프트웨어 자산(SoftwareAsset) 생성
   */
  const today = new Date();

  const softwareAssets: Array<{
    name: string;
    vendorName: string;
    category: "collaboration" | "designtool" | "security";
    seatsTotal: number;
    seatsUsed: number;
    purchaseDate: Date;
    expiryDate: Date;
    departmentId: number;
    cost: Prisma.Decimal;
    billingCycle: "monthly" | "yearly";
    status: "active" | "expired";
    description: string;
  }> = [
    // 🔴 만료 임박 (30일 이내)
    {
      name: "MS Office 365",
      vendorName: "Microsoft",
      category: "collaboration",
      seatsTotal: 50,
      seatsUsed: 20,
      purchaseDate: new Date("2024-01-20"),
      expiryDate: new Date(today.getTime() + 25 * 24 * 60 * 60 * 1000),
      departmentId: departments[0].id,
      cost: new Prisma.Decimal("1200000.00"),
      billingCycle: "monthly",
      status: "active",
      description: "전사 라이선스",
    },
    {
      name: "Adobe Creative Cloud",
      vendorName: "Adobe",
      category: "designtool",
      seatsTotal: 10,
      seatsUsed: 7,
      purchaseDate: new Date("2024-02-01"),
      expiryDate: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000),
      departmentId: departments[2].id,
      cost: new Prisma.Decimal("890000.00"),
      billingCycle: "monthly",
      status: "active",
      description: "디자인팀 전용",
    },

    // 🟡 주의 (90일 이내)
    {
      name: "Slack Business+",
      vendorName: "Slack",
      category: "collaboration",
      seatsTotal: 100,
      seatsUsed: 55,
      purchaseDate: new Date("2024-06-01"),
      expiryDate: new Date(today.getTime() + 80 * 24 * 60 * 60 * 1000),
      departmentId: departments[1].id,
      cost: new Prisma.Decimal("300000.00"),
      billingCycle: "monthly",
      status: "active",
      description: "전사 메신저",
    },

    // 🟢 안전 (90일 이후)
    {
      name: "Zoom Pro",
      vendorName: "Zoom",
      category: "collaboration",
      seatsTotal: 200,
      seatsUsed: 30,
      purchaseDate: new Date("2024-03-01"),
      expiryDate: new Date(today.getTime() + 180 * 24 * 60 * 60 * 1000),
      departmentId: departments[3].id,
      cost: new Prisma.Decimal("250000.00"),
      billingCycle: "monthly",
      status: "active",
      description: "영업팀 회의용",
    },

    // ⚫ 이미 만료 (테스트용)
    {
      name: "V3 백신",
      vendorName: "안랩",
      category: "security",
      seatsTotal: 100,
      seatsUsed: 0,
      purchaseDate: new Date("2023-01-01"),
      expiryDate: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
      departmentId: departments[0].id,
      cost: new Prisma.Decimal("500000.00"),
      billingCycle: "yearly",
      status: "expired",
      description: "갱신 필요",
    },
  ];

  for (const a of softwareAssets) {
    const created = await prisma.softwareAsset.create({
      data: {
        name: a.name,
        category: a.category,
        status: a.status,
        expiryDate: a.expiryDate,
        ownerAdminId: admin.id,

        vendorId: vendorMap.get(a.vendorName) ?? null,
        departmentId: a.departmentId,

        purchaseDate: a.purchaseDate,
        seatsTotal: a.seatsTotal,
        seatsUsed: a.seatsUsed,

        cost: a.cost,
        currency: "KRW",
        billingCycle: a.billingCycle,

        description: a.description,
      },
    });

    // 일부 자산에 사용자 할당
    if (["MS Office 365", "Adobe Creative Cloud", "Slack Business+"].includes(created.name)) {
      await prisma.assetAssignment.create({
        data: {
          assetId: created.id,
          userName: "송명진",
          userEmail: "song@company.com",
        },
      });
      await prisma.assetAssignment.create({
        data: {
          assetId: created.id,
          userName: "주병현",
          userEmail: "joo@company.com",
        },
      });
    }
  }

  console.log("✅ 소프트웨어 자산 생성 완료");

  console.log("🎉 시드 완료!");
  console.log("");
  console.log("로그인 정보:");
  console.log("  아이디: admin");
  console.log("  비밀번호: admin123");
}

main()
  .catch((e) => {
    console.error("❌ 시드 실패:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
