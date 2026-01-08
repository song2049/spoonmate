// prisma/seed.ts
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  /**
   * 1. 관리자(Admin) 생성
   * - SUPER_ADMIN으로 생성 (관리자 기능 테스트/운영 편의)
   * - isActive true 보장
   */
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.admin.upsert({
    where: { username: "admin" },
    update: {
      password: hashedPassword,
      name: "관리자",
      email: "admin@spoonmate.com",
      role: "SUPER_ADMIN",
      isActive: true,
    },
    create: {
      username: "admin",
      password: hashedPassword,
      name: "관리자",
      email: "admin@spoonmate.com",
      role: "SUPER_ADMIN",
      isActive: true,
    },
  });

  console.log("✅ 관리자 생성/업데이트:", admin.username, admin.role);

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
   * 3. 벤더(Vendor) 생성 (중복 방지: upsert)
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
   * - ⚠️ SoftwareAsset은 upsert 기준 키가 없어서 "존재하면 스킵" 방식으로 중복 방지
   * - 기준: (name + ownerAdminId)
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

  const assignmentTargets = new Set([
    "MS Office 365",
    "Adobe Creative Cloud",
    "Slack Business+",
  ]);

  for (const a of softwareAssets) {
    const exists = await prisma.softwareAsset.findFirst({
      where: { name: a.name, ownerAdminId: admin.id },
      select: { id: true, name: true },
    });

    let createdId: number;

    if (exists) {
      console.log(`↪️  [SKIP] SoftwareAsset already exists: ${exists.name} (id=${exists.id})`);
      createdId = exists.id;
    } else {
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

      console.log(`✅ SoftwareAsset created: ${created.name} (id=${created.id})`);
      createdId = created.id;
    }

    // 일부 자산에 사용자 할당 (중복 방지: assetId + userEmail 기준으로 있으면 스킵)
    if (assignmentTargets.has(a.name)) {
      const users = [
        { userName: "송명진", userEmail: "song@company.com" },
        { userName: "주병현", userEmail: "joo@company.com" },
      ];

      for (const u of users) {
        const assigned = await prisma.assetAssignment.findFirst({
          where: { assetId: createdId, userEmail: u.userEmail },
          select: { id: true },
        });

        if (assigned) {
          console.log(`↪️  [SKIP] Assignment exists: asset=${createdId}, email=${u.userEmail}`);
          continue;
        }

        await prisma.assetAssignment.create({
          data: {
            assetId: createdId,
            userName: u.userName,
            userEmail: u.userEmail,
          },
        });

        console.log(`✅ Assignment created: asset=${createdId}, user=${u.userName}`);
      }
    }
  }

  console.log("✅ 소프트웨어 자산 생성 완료");

  /**
   * 5. ✅ 등록 구조 확장용 seed (AssetType / AssetTypeField)
   * - 중복 방지: slug / (typeId+key) upsert
   */
  const types = [
    { slug: "hardware", name: "유형자산", order: 1 },
    { slug: "intangible", name: "무형자산", order: 2 },
    { slug: "software_generic", name: "소프트웨어(확장)", order: 3 },
    { slug: "subscription", name: "구독/라이선스", order: 4 },
  ];

  for (const t of types) {
    await prisma.assetType.upsert({
      where: { slug: t.slug },
      update: { name: t.name, order: t.order, isActive: true },
      create: { ...t, isActive: true },
    });
  }

  const softwareType = await prisma.assetType.findUnique({
    where: { slug: "software_generic" },
    select: { id: true },
  });

  if (softwareType) {
    const fields = [
      { key: "vendor", label: "벤더", fieldType: "text", required: false, order: 1 },
      { key: "expiryDate", label: "만료일", fieldType: "date", required: false, order: 2 },
      { key: "seats", label: "좌석 수", fieldType: "number", required: false, order: 3 },
      { key: "department", label: "부서", fieldType: "text", required: false, order: 4 },
      { key: "note", label: "비고", fieldType: "textarea", required: false, order: 99 },
    ] as const;

    for (const f of fields) {
      await prisma.assetTypeField.upsert({
        where: { typeId_key: { typeId: softwareType.id, key: f.key } },
        update: {
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          order: f.order,
          isActive: true,
        },
        create: {
          typeId: softwareType.id,
          key: f.key,
          label: f.label,
          fieldType: f.fieldType,
          required: f.required,
          order: f.order,
          isActive: true,
        },
      });
    }
  }

  console.log("✅ AssetType / AssetTypeField seed 완료");

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
