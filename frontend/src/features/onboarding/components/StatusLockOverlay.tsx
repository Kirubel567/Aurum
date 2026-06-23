"use client";

import { Clock3, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { simulateAdminDepositAction } from "@/src/features/onboarding/actions/deposit.actions";
import { broadcastDepositStatusChange } from "@/src/features/onboarding/lib/deposit-sync";
import type { DepositStatus } from "@/src/features/onboarding/types/deposit.types";
import { simulateAdminAction } from "@/src/features/onboarding/services/deposit.service";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

import { DepositCoordinates } from "./DepositCoordinates";
import { ProofUploader } from "./ProofUploader";

interface StatusLockOverlayProps {
  depositStatus: DepositStatus;
  investorName: string;
  onStatusChange: (status: DepositStatus) => void;
}

type DepositStep = "coordinates" | "upload";

export function StatusLockOverlay({
  depositStatus,
  investorName,
  onStatusChange,
}: StatusLockOverlayProps) {
  const [step, setStep] = useState<DepositStep>(
    depositStatus === "rejected" ? "upload" : "coordinates"
  );
  const [simulating, setSimulating] = useState<"approve" | "reject" | null>(
    null
  );
  const addToast = useNotificationStore((s) => s.addToast);

  const handleAdminSimulation = async (action: "approve" | "reject") => {
    setSimulating(action);
    try {
      const result = await simulateAdminAction(action);
      onStatusChange(result.depositStatus);
      broadcastDepositStatusChange();

      if (action === "approve") {
        addToast({
          title: "Account approved",
          description: "Portal access is now active.",
          variant: "success",
        });
      } else {
        addToast({
          title: "Submission rejected",
          description: "Please upload a valid payment document.",
          variant: "warning",
        });
      }
    } catch {
      const result = await simulateAdminDepositAction(action);
      onStatusChange(result.depositStatus);
      broadcastDepositStatusChange();
    } finally {
      setSimulating(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen overflow-y-auto bg-[#0B1221] px-4 pt-8 pb-16 sm:px-6 sm:pt-12 sm:pb-16">
      <div
        className={cn(
          "mx-auto w-full max-w-2xl rounded-[28px] border border-white/10",
          "bg-[#0B1221] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.65)]"
        )}
      >
        <div className="border-b border-white/8 px-6 py-5 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#C5A059]">
            Early Access Capital Raise
          </p>
          <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">
            Deposit Verification Required
          </h1>
          <p className="mt-2 text-sm text-white/55">
            Welcome, {investorName}. Portal access is restricted until your wire
            deposit is verified by our sovereign audit desk.
          </p>
        </div>

        <div className="px-6 py-8 pb-12 sm:px-8 sm:pb-16">
          {depositStatus === "none" && step === "coordinates" && (
            <DepositCoordinates onContinue={() => setStep("upload")} />
          )}

          {depositStatus === "none" && step === "upload" && (
            <ProofUploader
              onSubmitted={() => onStatusChange("pending")}
            />
          )}

          {depositStatus === "pending" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Clock3 className="size-8 text-[#C5A059]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-white">
                  Verification In Progress
                </h2>
                <p className="mx-auto max-w-md text-sm leading-6 text-white/60">
                  Your deposit proof has been received and is currently under
                  review by our sovereign audit team. You will be notified via
                  email immediately upon verification.
                </p>
              </div>
              <div className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-3 text-xs text-white/45">
                This screen will unlock automatically once your account is
                approved.
              </div>
            </div>
          )}

          {depositStatus === "rejected" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 p-4">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-[#EF4444]" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-[#EF4444]">
                    Document Rejected
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/65">
                    We could not verify your submitted payment document. Please
                    upload a valid bank wire transfer receipt to continue.
                  </p>
                </div>
              </div>
              <ProofUploader
                rejected
                onSubmitted={() => onStatusChange("pending")}
              />
            </div>
          )}
        </div>

        {process.env.NODE_ENV === "development" && (
          <div className="border-t border-dashed border-[#C5A059]/25 bg-[#111a2e] px-6 py-5 sm:px-8">
            <div className="mb-3 flex items-center gap-2 text-[#C5A059]">
              <ShieldCheck className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Development Admin Controls
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={!!simulating}
                onClick={() => handleAdminSimulation("approve")}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#10B981]/40 bg-[#10B981]/10 text-sm font-medium text-[#10B981] hover:bg-[#10B981]/15 disabled:opacity-60"
              >
                {simulating === "approve" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Simulate Admin Approval
              </button>
              <button
                type="button"
                disabled={!!simulating}
                onClick={() => handleAdminSimulation("reject")}
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/10 text-sm font-medium text-[#EF4444] hover:bg-[#EF4444]/15 disabled:opacity-60"
              >
                {simulating === "reject" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Simulate Admin Rejection
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
