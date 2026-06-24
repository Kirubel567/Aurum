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
          A confirmation link has been sent to:
        </p>
        <p className="text-sm font-semibold text-slate-800">{investorEmail}</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
        Click the confirmation link in your email to proceed with your deposit
        verification. Wire transfer instructions will be available once your
        email is confirmed.
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
        <span className="mt-0.5 text-base leading-none">📬</span>
        <p className="text-xs leading-5 text-amber-800">
          <span className="font-semibold">Can&apos;t find the email?</span>{" "}
          Please check your <span className="font-semibold">Spam</span> or{" "}
          <span className="font-semibold">Junk</span> folder — the email may
          have been filtered automatically. Mark it as{" "}
          <span className="font-semibold">Not Spam</span> to ensure you receive
          all future notifications from Aurum Sovereign Capital.
        </p>
      </div>
    </div>
  );
}
