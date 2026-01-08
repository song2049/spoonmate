import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;

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
