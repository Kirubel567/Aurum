"use client";

import { Bell, Clock3, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { broadcastDepositStatusChange } from "@/src/features/onboarding/lib/deposit-sync";
import { signOutInvestor } from "@/src/features/onboarding/lib/investor-sign-out";
import type { DepositStatus } from "@/src/features/onboarding/types/deposit.types";
import { ROUTES } from "@/src/lib/constants/routes";
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
}: StatusLockOverlayProps) {
  const router = useRouter();
  const [step, setStep] = useState<DepositStep>(() =>
    resolveInitialStep(depositStatus, emailVerified)
  );
  const [depositAmount, setDepositAmount] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (emailVerified && step === "email-verify") {
      setStep(depositStatus === "rejected" ? "upload" : "coordinates");
    }
  }, [depositStatus, emailVerified, step]);

  useEffect(() => {
    if (depositStatus === "rejected") {
      setStep("upload");
    }
  }, [depositStatus]);

  const handleProofSubmitted = (status: DepositStatus) => {
    onStatusChange(status);
    broadcastDepositStatusChange();
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOutInvestor();
      router.replace(ROUTES.LOGIN);
    } catch {
      setSigningOut(false);
    }
  };

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
            <EmailVerificationPanel investorEmail={investorEmail} />
          )}

          {emailVerified && depositStatus === "none" && step === "coordinates" && (
            <DepositCoordinates
              amount={depositAmount}
              onAmountChange={setDepositAmount}
              onContinue={() => setStep("upload")}
            />
          )}

          {emailVerified && depositStatus === "none" && step === "upload" && (
            <ProofUploader
              depositAmount={depositAmount}
              onDepositAmountChange={setDepositAmount}
              onSubmitted={() => handleProofSubmitted("pending")}
            />
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
              <div className="flex items-start gap-3 rounded-xl border border-[#C5A059]/25 bg-[#C5A059]/5 px-4 py-3 text-left">
                <Bell className="mt-0.5 size-4 shrink-0 text-[#C5A059]" />
                <p className="text-xs leading-5 text-slate-600">
                  <span className="font-semibold text-slate-800">Platform launch date:</span>{" "}
                  The official trading start date will be announced to all
                  verified investors via email before the platform goes live.
                  Please ensure your email address is active.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                className="mt-6 flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-60"
              >
                {signingOut ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Sign out of account
              </button>
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
                    Please upload a valid bank transfer receipt to continue.
                  </p>
                </div>
              </div>
              <ProofUploader
                rejected
                depositAmount={depositAmount}
                onDepositAmountChange={setDepositAmount}
                showDepositAmount
                onSubmitted={() => handleProofSubmitted("pending")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
