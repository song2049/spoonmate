import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type Ctx = {
  params: Promise<{ slug: string }>;
};

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { slug } = await params;

  const item = await prisma.assetType.findUnique({
    where: { slug },
    include: {
      fields: {
        where: { isActive: true },
        orderBy: [{ order: "asc" }, { id: "asc" }],
        select: {
          id: true,
          key: true,
          label: true,
          fieldType: true,
          required: true,
          optionsJson: true,
          order: true,
        },
      },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({
    item: {
      id: item.id,
      slug: item.slug,
      name: item.name,
      fields: item.fields,
    },
  });
}
