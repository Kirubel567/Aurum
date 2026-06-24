"use client";

import { ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface ApprovedHoldingViewProps {
  investorName: string;
}

export function ApprovedHoldingView({ investorName }: ApprovedHoldingViewProps) {
  return (
    <div className="fixed inset-0 z-50 min-h-screen overflow-y-auto bg-slate-50 px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-16">
      <div
        className={cn(
          "mx-auto w-full max-w-2xl rounded-[28px] border border-slate-200",
          "bg-white shadow-[0_24px_60px_-24px_rgba(15,23,42,0.12)]"
        )}
      >
        <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
            Early Access Capital Raise
          </p>
          <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            Account Verified &amp; Allocation Locked
          </h1>
        </div>

        <div className="space-y-6 px-6 py-10 text-center sm:px-8">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10">
            <ShieldCheck className="size-8 text-[#C5A059]" />
          </div>

          <p className="text-sm text-slate-600">
            Welcome, {investorName}.
          </p>

          <div className="mx-auto max-w-lg space-y-4 text-left">
            <p className="text-sm leading-7 text-slate-700">
              Your bank wire deposit proof has been successfully audited and
              approved. Your early-stage capital allocation is officially
              secured.
            </p>
            <p className="text-sm leading-7 text-slate-700">
              The sovereign capital platform is currently undergoing final
              deployment configurations. You will receive an automated email
              notification the moment the terminal opens for live capital
              execution.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
            No further action is required at this time. Please retain your wire
            transfer confirmation for your records.
          </div>
        </div>
      </div>
    </div>
  );
}
