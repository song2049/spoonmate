import Link from "next/link";

export default function DashboardNewPage() {
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">등록</h1>

      <div className="space-y-2">
        <Link className="block underline" href="/dashboard/assets/software/new">
          소프트웨어 자산 등록
        </Link>
        {/* 필요하면 하드웨어도 */}
        {/* <Link className="block underline" href="/dashboard/assets/hardware/new">
          하드웨어 자산 등록
        </Link> */}
      </div>
    </div>
  );
}
