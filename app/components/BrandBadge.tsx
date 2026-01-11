"use client";

import { useBrand } from "./BrandProvider";

export default function BrandBadge({ suffix }: { suffix: string }) {
  const { brand } = useBrand();
  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
      <span className="inline-block h-2 w-2 rounded-full bg-gray-700" />
      {brand.companyName} • {suffix}
    </div>
  );
}
