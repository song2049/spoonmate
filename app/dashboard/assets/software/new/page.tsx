import SoftwareAssetForm from "./SoftwareAssetForm";

export default function Page() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-semibold">소프트웨어 자산 등록</h1>
      <div className="mt-6">
        <SoftwareAssetForm />
      </div>
    </div>
  );
}
