import { Shield } from "lucide-react";

import { ONBOARDING_ASSETS } from "@/src/lib/constants/countries";

export function SecurityBanner() {
  return (
    <div className="relative mt-8 flex items-center justify-between overflow-hidden rounded-2xl border border-slate-100 bg-blue-50/50 p-6">
      <div className="relative z-10 flex items-center gap-4">
        <div className="shrink-0 rounded-lg bg-blue-500/10 p-3">
          <Shield className="size-6 fill-blue-600 text-blue-600" />
        </div>
        <div>
          <h4 className="mb-1 text-sm font-bold text-[#050B14]">
            Your Security is Our Priority
          </h4>
          <p className="max-w-md text-[13px] leading-relaxed text-slate-500">
            Your information is encrypted and protected with industry-leading
            security standards.
          </p>
        </div>
      </div>
      <div className="relative z-10 ml-4 hidden shrink-0 sm:block">
        <img
          src={ONBOARDING_ASSETS.securityPadlock}
          alt="Security"
          className="size-20 object-contain"
        />
      </div>
    </div>
  );
}
