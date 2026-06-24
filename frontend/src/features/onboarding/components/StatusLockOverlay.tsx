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
import { EmailVerificationPanel } from "./EmailVerificationPanel";
import { ProofUploader } from "./ProofUploader";

interface StatusLockOverlayProps {
  depositStatus: DepositStatus;
  emailVerified: boolean;
  investorName: string;
  investorEmail: string;
  onStatusChange: (status: DepositStatus) => void;
  onEmailVerified: () => void;
}

type DepositStep = "email-verify" | "coordinates" | "upload";

function resolveInitialStep(
  depositStatus: DepositStatus,
  emailVerified: boolean
): DepositStep {
  if (!emailVerified) return "email-verify";
  if (depositStatus === "rejected") return "upload";
  return "coordinates";
}

export function StatusLockOverlay({
  depositStatus,
  emailVerified,
  investorName,
  investorEmail,
  onStatusChange,
  onEmailVerified,
}: StatusLockOverlayProps) {
  const [step, setStep] = useState<DepositStep>(() =>
    resolveInitialStep(depositStatus, emailVerified)
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
        setStep("upload");
      }
    } catch {
      const result = await simulateAdminDepositAction(action);
      onStatusChange(result.depositStatus);
      broadcastDepositStatusChange();
      if (action === "reject") {
        setStep("upload");
      }
    } finally {
      setSimulating(null);
    }
  };

  const showDevControls =
    process.env.NODE_ENV === "development" &&
    (depositStatus === "pending" || depositStatus === "rejected");

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
            Deposit Verification Required
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Welcome, {investorName}. Portal access is restricted until your wire
            deposit is verified by our sovereign audit desk.
          </p>
        </div>

        <div className="px-6 py-8 pb-12 sm:px-8 sm:pb-16">
          {!emailVerified && (
            <EmailVerificationPanel
              investorEmail={investorEmail}
              onVerified={() => {
                onEmailVerified();
                setStep("coordinates");
              }}
            />
          )}

          {emailVerified && depositStatus === "none" && step === "coordinates" && (
            <DepositCoordinates onContinue={() => setStep("upload")} />
          )}

          {emailVerified && depositStatus === "none" && step === "upload" && (
            <ProofUploader onSubmitted={() => onStatusChange("pending")} />
          )}

          {depositStatus === "pending" && (
            <div className="space-y-5 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10">
                <Clock3 className="size-8 text-[#C5A059]" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold text-slate-900">
                  Verification In Progress
                </h2>
                <p className="mx-auto max-w-md text-sm leading-6 text-slate-600">
                  Your deposit proof has been received and is currently under
                  review by our sovereign audit team. You will be notified via
                  email immediately upon verification.
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                This screen will unlock automatically once your account is
                approved.
              </div>
            </div>
          )}

          {depositStatus === "rejected" && (
            <div className="space-y-6">
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <ShieldAlert className="mt-0.5 size-5 shrink-0 text-red-600" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-red-700">
                    Document Rejected
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    We could not verify your submitted payment document. There
                    may be a discrepancy with your wire transfer details.
                    Please upload a valid bank wire transfer receipt to
                    continue.
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

        {showDevControls && (
          <div className="border-t border-dashed border-[#C5A059]/25 bg-amber-50/50 px-6 py-5 sm:px-8">
            <div className="mb-3 flex items-center gap-2 text-[#9A7B3C]">
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
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 text-sm font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
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
                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
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
