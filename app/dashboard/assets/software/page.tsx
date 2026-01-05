import { Suspense } from "react";
import SoftwareAssetsClient from "./SoftwareAssetsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <SoftwareAssetsClient />
    </Suspense>
  );
}
