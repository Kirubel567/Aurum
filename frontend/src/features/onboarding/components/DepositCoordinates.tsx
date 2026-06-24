"use client";

import { Check, ChevronDown, Copy, Hash, Landmark } from "lucide-react";
import { useState } from "react";

import { copyToClipboard } from "@/src/features/onboarding/lib/copy-to-clipboard";
import {
  DEFAULT_ETHIOPIAN_BANK_ID,
  ETHIOPIAN_BANK_ACCOUNTS,
  getEthiopianBankById,
} from "@/src/features/onboarding/lib/ethiopian-banks";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

interface DepositCoordinatesProps {
  onContinue: () => void;
}

export function DepositCoordinates({ onContinue }: DepositCoordinatesProps) {
  const [selectedBankId, setSelectedBankId] = useState(DEFAULT_ETHIOPIAN_BANK_ID);
  const [copied, setCopied] = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);

  const selectedBank =
    getEthiopianBankById(selectedBankId) ?? ETHIOPIAN_BANK_ACCOUNTS[0];

  const handleCopyAccountNumber = async () => {
    const success = await copyToClipboard(selectedBank.accountNumber);
    if (success) {
      setCopied(true);
      addToast({
        title: "Copied!",
        description: "Account number copied to clipboard.",
        variant: "success",
      });
      window.setTimeout(() => setCopied(false), 1600);
      return;
    }

    addToast({
      title: "Copy failed",
      description: "Unable to copy to clipboard. Please copy manually.",
      variant: "error",
    });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10">
          <Landmark className="size-7 text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
          Sovereign Deposit Instructions
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-6 text-slate-600">
          Select your preferred Ethiopian banking institution and transfer your
          capital allocation to the account details below. Upload your official
          receipt once the transfer is complete.
        </p>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="bank-selector"
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500"
        >
          Banking Institution
        </label>
        <div className="relative">
          <select
            id="bank-selector"
            value={selectedBankId}
            onChange={(event) => {
              setSelectedBankId(event.target.value);
              setCopied(false);
            }}
            className={cn(
              "h-12 w-full appearance-none rounded-xl border border-slate-200",
              "bg-white px-4 pr-10 text-sm font-medium text-slate-900",
              "shadow-sm transition-colors focus:border-[#C5A059] focus:outline-none focus:ring-2 focus:ring-[#C5A059]/20"
            )}
          >
            {ETHIOPIAN_BANK_ACCOUNTS.map((bank) => (
              <option key={bank.id} value={bank.id}>
                {bank.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Account Holder Name
          </p>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {selectedBank.accountHolder}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
              Account Number
            </p>
            <p className="truncate text-sm font-medium text-slate-900">
              {selectedBank.accountNumber}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {copied && (
              <span className="text-xs font-medium text-emerald-600" role="status">
                Copied!
              </span>
            )}
            <button
              type="button"
              onClick={handleCopyAccountNumber}
              className={cn(
                "flex size-9 items-center justify-center rounded-lg border transition-colors",
                copied
                  ? "border-emerald-300 bg-emerald-50 text-emerald-600"
                  : "border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/10"
              )}
              aria-label={
                copied ? "Account number copied" : "Copy account number"
              }
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#C5A059]/20 bg-[#C5A059]/5 px-4 py-3 text-xs leading-5 text-slate-600">
        Transfers must originate from an account in the investor&apos;s legal
        name. Third-party transfers will be rejected during audit.
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
        I Have Initiated My Transfer — Continue
      </button>
    </div>
  );
}
