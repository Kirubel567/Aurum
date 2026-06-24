"use client";

import { Loader2, MailCheck } from "lucide-react";
import { useState } from "react";

import { verifyEmailViaApi } from "@/src/features/onboarding/services/deposit.service";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

interface EmailVerificationPanelProps {
  investorEmail: string;
  onVerified: () => void;
}

export function EmailVerificationPanel({
  investorEmail,
  onVerified,
}: EmailVerificationPanelProps) {
  const [simulating, setSimulating] = useState(false);
  const addToast = useNotificationStore((s) => s.addToast);

  const handleSimulateClick = async () => {
    setSimulating(true);
    try {
      await verifyEmailViaApi();
      addToast({
        title: "Email verified",
        description: "Your email has been confirmed. Proceed to wire instructions.",
        variant: "success",
      });
      onVerified();
    } catch {
      addToast({
        title: "Verification failed",
        description: "Unable to confirm your email. Please try again.",
        variant: "error",
      });
    } finally {
      setSimulating(false);
    }
  };

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

      {process.env.NODE_ENV === "development" && (
        <button
          type="button"
          disabled={simulating}
          onClick={handleSimulateClick}
          className={cn(
            "flex h-11 w-full items-center justify-center gap-2 rounded-xl",
            "border border-dashed border-[#C5A059]/50 bg-[#C5A059]/5",
            "text-sm font-medium text-[#9A7B3C]",
            "transition-colors hover:bg-[#C5A059]/10 disabled:opacity-60"
          )}
        >
          {simulating ? (
            <Loader2 className="size-4 animate-spin" />
          ) : null}
          Simulate Email Link Click
        </button>
      )}
    </div>
  );
}
