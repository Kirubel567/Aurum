import { Suspense } from "react";
import { FundingUploadPage } from "@/src/features/funding/components/FundingUploadPage";

export default function FundingUploadRoute() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-500">Loading...</div>}>
      <FundingUploadPage />
    </Suspense>
  );
}
