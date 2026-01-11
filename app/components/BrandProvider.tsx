"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";

export type Brand = {
  companyName: string;
  logoUrl?: string | null;
  updatedAt?: string;
};

type BrandContextValue = {
  brand: Brand;
  refresh: () => Promise<void>;
  setBrand: (b: Partial<Brand>) => void;
};

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrandState] = useState<Brand>({ companyName: "SpoonMate", logoUrl: "/spoonmate.png" });

  const setBrand = useCallback((b: Partial<Brand>) => {
    setBrandState((prev) => ({ ...prev, ...b }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await apiFetch<Brand>("/api/brand");
      setBrandState({
        companyName: data.companyName || "SpoonMate",
        logoUrl: data.logoUrl || "/spoonmate.png",
        updatedAt: data.updatedAt,
      });
    } catch {
      // 로그인 전/세션 만료 등에서는 조용히 기본값 유지
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ brand, refresh, setBrand }), [brand, refresh, setBrand]);
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrand must be used within BrandProvider");
  return ctx;
}
