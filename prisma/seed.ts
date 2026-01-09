// prisma/seed.ts
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * ✅ Seed 목표
 * 1) 어디서든 pull 후 db push/migrate + seed만 하면 동일하게 동작
 * 2) 여러 번 seed 실행해도 중복 없이 안정적으로 유지 (idempotent)
 * 3) "등록 가능한 유형이 없습니다" 방지: AssetType/AssetTypeField 기본값 보장
 */

async function seedAdmin() {
  console.log("👤 [1/5] Admin seed...");

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

  console.log(
    "✅ Admin:",
    admin.username,
    admin.role,
    "isActive=",
    admin.isActive
  );
  return admin;
}

async function seedDepartments() {
  console.log("🏢 [2/5] Department seed...");

  const names = ["IT팀", "총무팀", "개발팀", "영업팀"];
  const departments = await Promise.all(
    names.map((name) =>
      prisma.department.upsert({
        where: { name },
        update: {},
        create: { name },
      })
    )
  );

  console.log("✅ Departments:", departments.map((d) => d.name).join(", "));
  return departments;
}

async function seedVendors() {
  console.log("🏷️ [3/5] Vendor seed...");

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

  console.log("✅ Vendors:", vendors.map((v) => v.name).join(", "));
  return vendorMap;
}

async function seedSoftwareAssets(params: {
  adminId: number;
  departments: { id: number; name: string }[];
  vendorMap: Map<string, number>;
}) {
  console.log("💿 [4/5] SoftwareAsset seed...");

  const { adminId, departments, vendorMap } = params;
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
      where: { name: a.name, ownerAdminId: adminId },
      select: { id: true, name: true },
    });

    let assetId: number;

    if (exists) {
      console.log(
        `↪️  [SKIP] SoftwareAsset exists: ${exists.name} (id=${exists.id})`
      );
      assetId = exists.id;
    } else {
      const created = await prisma.softwareAsset.create({
        data: {
          name: a.name,
          category: a.category,
          status: a.status,
          expiryDate: a.expiryDate,
          ownerAdminId: adminId,

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

      console.log(
        `✅ SoftwareAsset created: ${created.name} (id=${created.id})`
      );
      assetId = created.id;
    }

    // 일부 자산에 사용자 할당 (중복 방지: assetId + userEmail)
    if (assignmentTargets.has(a.name)) {
      const users = [
        { userName: "송명진", userEmail: "song@company.com" },
        { userName: "주병현", userEmail: "joo@company.com" },
      ];

      for (const u of users) {
        const assigned = await prisma.assetAssignment.findFirst({
          where: { assetId, userEmail: u.userEmail },
          select: { id: true },
        });

        if (assigned) {
          console.log(
            `↪️  [SKIP] Assignment exists: asset=${assetId}, email=${u.userEmail}`
          );
          continue;
        }

        await prisma.assetAssignment.create({
          data: {
            assetId,
            userName: u.userName,
            userEmail: u.userEmail,
          },
        });

        console.log(
          `✅ Assignment created: asset=${assetId}, user=${u.userName}`
        );
      }
    }
  }

  console.log("✅ SoftwareAsset seed done");
}

/**
 * ✅ 핵심: 동적자산 등록 화면이 "등록 가능한 유형 없음"이 안 뜨려면
 * - AssetType에 최소한 software/hardware/etc 같은 "코어 타입"이 존재해야 함
 * - 그리고 각 타입별로 최소 필드(AssetTypeField)가 있어야 폼이 구성됨
 */
async function seedAssetTypesAndFields() {
  console.log("🧩 [5/5] AssetType / AssetTypeField seed...");

  // 1) 코어 타입(필수) + 확장 타입(선택)
  const coreTypes = [
    { slug: "software", name: "소프트웨어", order: 1 },
    { slug: "hardware", name: "하드웨어", order: 2 },
    { slug: "etc", name: "기타", order: 3 },
  ] as const;

  const extraTypes = [
    { slug: "subscription", name: "구독/라이선스", order: 4 },
    { slug: "intangible", name: "무형자산", order: 5 },
  ] as const;

  const allTypes = [...coreTypes, ...extraTypes];

  for (const t of allTypes) {
    await prisma.assetType.upsert({
      where: { slug: t.slug },
      update: { name: t.name, order: t.order, isActive: true },
      create: { slug: t.slug, name: t.name, order: t.order, isActive: true },
    });
  }

  // 2) typeId 맵
  const typeRows = await prisma.assetType.findMany({
    where: { slug: { in: allTypes.map((t) => t.slug) } },
    select: { id: true, slug: true },
  });
  const typeIdBySlug = new Map(typeRows.map((t) => [t.slug, t.id]));

  // 3) 공통 필드 (모든 타입에 최소 제공)
  const commonFields = [
    {
      key: "vendor",
      label: "제조사/공급사",
      fieldType: "text",
      required: false,
      order: 1,
    },
    {
      key: "model",
      label: "모델/제품명",
      fieldType: "text",
      required: false,
      order: 2,
    },
    {
      key: "serial",
      label: "시리얼/라이선스키",
      fieldType: "text",
      required: false,
      order: 3,
    },
    {
      key: "note",
      label: "비고",
      fieldType: "textarea",
      required: false,
      order: 99,
    },
  ] as const;

  // 4) 타입별 확장 필드
  const perTypeFields: Record<string, ReadonlyArray<any>> = {
    software: [
      {
        key: "version",
        label: "버전",
        fieldType: "text",
        required: false,
        order: 10,
      },
      {
        key: "licenseType",
        label: "라이선스 타입",
        fieldType: "select",
        required: false,
        order: 11,
      },
      {
        key: "expiresAt",
        label: "만료일",
        fieldType: "date",
        required: false,
        order: 12,
      },
      {
        key: "seats",
        label: "좌석 수",
        fieldType: "number",
        required: false,
        order: 13,
      },
    ],
    hardware: [
      {
        key: "purchasedAt",
        label: "구매일",
        fieldType: "date",
        required: false,
        order: 10,
      },
      {
        key: "warrantyUntil",
        label: "보증만료일",
        fieldType: "date",
        required: false,
        order: 11,
      },
      {
        key: "assignedTo",
        label: "사용자",
        fieldType: "text",
        required: false,
        order: 12,
      },
    ],
    subscription: [
      {
        key: "expiresAt",
        label: "만료일",
        fieldType: "date",
        required: false,
        order: 10,
      },
      {
        key: "billingCycle",
        label: "결제주기",
        fieldType: "select",
        required: false,
        order: 11,
      },
      {
        key: "amount",
        label: "금액",
        fieldType: "number",
        required: false,
        order: 12,
      },
    ],
    intangible: [
      {
        key: "expiresAt",
        label: "만료일",
        fieldType: "date",
        required: false,
        order: 10,
      },
      {
        key: "owner",
        label: "관리부서/담당",
        fieldType: "text",
        required: false,
        order: 11,
      },
    ],
    etc: [
      {
        key: "expiresAt",
        label: "만료일",
        fieldType: "date",
        required: false,
        order: 10,
      },
    ],
  };

  // 5) upsert 함수 (복합 유니크: typeId_key 필요)
  async function upsertField(typeId: number, f: any) {
    await prisma.assetTypeField.upsert({
      where: { typeId_key: { typeId, key: f.key } },
      update: {
        label: f.label,
        fieldType: f.fieldType,
        required: f.required ?? false,
        order: f.order ?? 0,
        isActive: true,
      },
      create: {
        typeId,
        key: f.key,
        label: f.label,
        fieldType: f.fieldType,
        required: f.required ?? false,
        order: f.order ?? 0,
        isActive: true,
      },
    });
  }

  // 6) 모든 타입에 공통 필드 삽입
  for (const [slug, typeId] of typeIdBySlug.entries()) {
    // 공통 필드
    for (const f of commonFields) {
      await upsertField(typeId, f);
    }

    // 타입별 필드
    const extras = perTypeFields[slug] ?? [];
    for (const f of extras) {
      await upsertField(typeId, f);
    }
  }

  console.log("✅ AssetType / AssetTypeField seed done");
}

async function main() {
  console.log("🌱 시드 데이터 생성 시작...");

  const admin = await seedAdmin();
  const departments = await seedDepartments();
  const vendorMap = await seedVendors();

  await seedSoftwareAssets({
    adminId: admin.id,
    departments,
    vendorMap,
  });

  await seedAssetTypesAndFields();

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
