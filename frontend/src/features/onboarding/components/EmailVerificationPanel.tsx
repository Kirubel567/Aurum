"use client";

import { MailCheck } from "lucide-react";

interface EmailVerificationPanelProps {
  investorEmail: string;
}

export function EmailVerificationPanel({
  investorEmail,
}: EmailVerificationPanelProps) {
  return (
    <div className="space-y-6 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10">
        <MailCheck className="size-8 text-[#C5A059]" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-slate-900">
          Verify Your Email
        </h2>
        <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
          A confirmation link has been sent to your email address.
        </p>
        <p className="text-sm font-medium text-slate-700">{investorEmail}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        Please check your inbox and click the confirmation link to proceed with
        your deposit verification. Wire transfer instructions will be available
        once your email is confirmed.
      </div>
    </div>
  );
}
