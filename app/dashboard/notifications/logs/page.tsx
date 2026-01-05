import { Suspense } from "react";
import LogsClient from "./LogsClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <LogsClient />
    </Suspense>
  );
}
