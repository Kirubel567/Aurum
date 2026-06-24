"use client";

import { Building2, Copy, Hash, Landmark } from "lucide-react";
import { useState } from "react";

import { CORPORATE_BANK_COORDINATES } from "@/src/features/onboarding/lib/bank-coordinates";
import { cn } from "@/lib/utils";

interface DepositCoordinatesProps {
  onContinue: () => void;
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-slate-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#C5A059]/30 text-[#C5A059] transition-colors hover:bg-[#C5A059]/10"
        aria-label={`Copy ${label}`}
      >
        <Copy className="size-4" />
      </button>
      {copied && (
        <span className="sr-only" role="status">
          Copied
        </span>
      )}
    </div>
  );
}

export function DepositCoordinates({ onContinue }: DepositCoordinatesProps) {
  const bank = CORPORATE_BANK_COORDINATES;

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10">
          <Landmark className="size-7 text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sovereign Wire Instructions
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600">
          {bank.instructions}
        </p>
      </div>

      <div className="grid gap-3">
        <CopyRow label="Bank Name" value={bank.bankName} />
        <CopyRow label="Account Name" value={bank.accountName} />
        <CopyRow label="Account Number" value={bank.accountNumber} />
        <CopyRow label="Routing Number" value={bank.routingNumber} />
        <CopyRow label="SWIFT / BIC" value={bank.swiftCode} />
        <CopyRow label="Wire Reference" value={bank.referenceCode} />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#C5A059]/20 bg-[#C5A059]/5 p-4">
        <Building2 className="mt-0.5 size-5 shrink-0 text-[#C5A059]" />
        <div>
          <p className="text-sm font-medium text-[#9A7B3C]">
            Settlement Currency: {bank.currency}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Transfers must originate from an account in the investor&apos;s legal
            name. Third-party wires will be rejected during audit.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-xl",
          "bg-[#C5A059] text-sm font-semibold text-white",
          "transition-all hover:bg-[#b8944f] active:scale-[0.99]"
        )}
      >
        <Hash className="size-4" />
        I Have Initiated My Wire — Continue
      </button>
    </div>
  );
}
