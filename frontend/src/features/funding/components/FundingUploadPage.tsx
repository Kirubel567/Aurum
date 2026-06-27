"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { broadcastDepositStatusChange } from "@/src/features/onboarding/lib/deposit-sync";
import { validateProofFile, formatMaxProofSize } from "@/src/features/onboarding/lib/deposit-limits";
import { submitProofViaApi } from "@/src/features/onboarding/services/deposit.service";
import { useNotificationStore } from "@/src/store/notification.store";
import { ROUTES } from "@/src/lib/constants/routes";
import { ETHIOPIAN_BANK_ACCOUNTS } from "@/src/features/onboarding/lib/ethiopian-banks";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMethodLabel(method: string | null, id: string | null): { name: string; type: string } {
  if (method === "bank") {
    const bank = ETHIOPIAN_BANK_ACCOUNTS.find((b) => b.id === id);
    return { name: bank?.label ?? "Bank Transfer", type: "Bank Transfer" };
  }
  if (method === "ewallet") {
    const labels: Record<string, string> = { telebirr: "TeleBirr", cbebirr: "CBE Birr" };
    return { name: labels[id ?? ""] ?? "E-Wallet", type: "E-Wallet" };
  }
  if (method === "crypto") {
    const labels: Record<string, string> = { usdt: "USDT (TRC-20)", btc: "Bitcoin (BTC)", eth: "Ethereum (ETH)" };
    return { name: labels[id ?? ""] ?? "Cryptocurrency", type: "Cryptocurrency" };
  }
  if (method === "other") {
    const labels: Record<string, string> = { wire: "International Wire Transfer", westernunion: "Western Union", moneygram: "MoneyGram" };
    return { name: labels[id ?? ""] ?? "Other", type: "Other Method" };
  }
  return { name: "Commercial Bank of Ethiopia", type: "Bank Transfer" };
}

function formatAmount(raw: string | null): string {
  const n = parseFloat(raw ?? "0");
  if (!n) return "$1,200.00";
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function generateTxId(): string {
  const r = () => Math.floor(1000 + Math.random() * 9000);
  return `${r()} ${r()} ${r()}`;
}

const NOW = new Date().toLocaleString("en-US", {
  month: "short", day: "numeric", year: "numeric",
  hour: "numeric", minute: "2-digit", hour12: true,
});

// ── Progress stepper ──────────────────────────────────────────────────────────

type StepConfig = {
  label: string;
  // Where clicking a completed step navigates. null = no navigation (disabled).
  href: string | null;
  tooltip: string;
};

const STEPS: StepConfig[] = [
  {
    label: "Account Information",
    href: null,
    tooltip: "Already completed at sign-up",
  },
  {
    label: "Choose Payment Method",
    href: ROUTES.FUNDING,
    tooltip: "Go back to choose a payment method",
  },
  {
    label: "Payment Details",
    href: ROUTES.FUNDING,
    tooltip: "Go back to payment details",
  },
  {
    label: "Upload Bank Proof",
    href: null,
    tooltip: "Current step",
  },
  {
    label: "Registration Complete",
    href: null,
    tooltip: "Complete after upload",
  },
];

function ProgressStepper({
  success,
  onNavigate,
}: {
  success: boolean;
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="relative flex justify-between mb-12 max-w-5xl mx-auto">
      {/* background line */}
      <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-200 z-0" />
      {/* filled line — 75% when on step 4, 100% when success */}
      <div
        className="absolute top-5 left-0 h-0.5 bg-emerald-500 z-0 transition-all duration-700"
        style={{ width: success ? "100%" : "75%" }}
      />

      {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const done = success ? true : stepNum < 4;
        const active = !success && stepNum === 4;
        const complete = success && stepNum === 5;
        const pending = !success && stepNum === 5;
        const clickable = done && step.href !== null;

        const circle = (
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${done || complete ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : ""}
              ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-200 ring-4 ring-white" : ""}
              ${pending ? "bg-white border-2 border-slate-300 text-slate-400" : ""}
              ${clickable ? "cursor-pointer hover:brightness-110 hover:scale-105" : ""}
            `}
          >
            {done || complete ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
              </svg>
            ) : (
              stepNum
            )}
          </div>
        );

        return (
          <div key={step.label} className="flex flex-col items-center gap-2 relative z-10 group">
            {clickable ? (
              <button
                title={step.tooltip}
                onClick={() => onNavigate(step.href!)}
                className="focus:outline-none"
              >
                {circle}
              </button>
            ) : (
              <div title={step.tooltip}>{circle}</div>
            )}

            <span
              className={`text-[11px] uppercase tracking-wider text-center max-w-[100px] transition-colors
                ${active || complete ? "font-bold text-slate-800" : "font-medium text-slate-500"}
                ${clickable ? "group-hover:text-slate-700" : ""}
              `}
            >
              {step.label}
            </span>

            {/* Tooltip on hover for clickable completed steps */}
            {clickable && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] bg-slate-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {step.tooltip}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── File drop zone ────────────────────────────────────────────────────────────

function DropZone({
  file,
  dragActive,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileChange,
  onRemove,
}: {
  file: File | null;
  dragActive: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (file) {
    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    return (
      <div className="border-2 border-dashed border-emerald-200 rounded-2xl p-8 bg-emerald-50/30 flex flex-col items-center justify-center text-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Proof preview"
            className="max-h-48 rounded-xl mb-4 object-contain border border-slate-200"
          />
        ) : (
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        )}
        <p className="font-bold text-slate-800 text-sm">{file.name}</p>
        <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={onRemove}
            className="text-xs font-bold text-red-500 hover:underline"
          >
            Remove
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            className="text-xs font-bold text-blue-600 hover:underline"
          >
            Replace
          </button>
        </div>
        <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={onFileChange} />
      </div>
    );
  }

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
        dragActive
          ? "border-blue-400 bg-blue-50"
          : "border-blue-100 bg-blue-50/30 hover:bg-blue-50/50"
      }`}
      onClick={() => inputRef.current?.click()}
    >
      <div className="w-16 h-16 bg-blue-100/50 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
      </div>
      <h4 className="text-lg font-bold text-slate-800">Drag &amp; drop your file here</h4>
      <p className="text-sm text-slate-400 my-2">or</p>
      <button
        type="button"
        className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 mb-4"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
      >
        Choose File
      </button>
      <p className="text-xs text-slate-400">PNG, JPG, JPEG or PDF (Max. {formatMaxProofSize()})</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp"
        className="sr-only"
        onChange={onFileChange}
      />
    </div>
  );
}

// ── Third-party details form ──────────────────────────────────────────────────

function ThirdPartyForm({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  if (!visible) return null;
  return (
    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h6 className="text-sm font-bold text-slate-800">Third-Party Account Details</h6>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Account Holder Name</label>
        <input type="text" placeholder="Full legal name" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Bank Name</label>
        <input type="text" placeholder="e.g. Commercial Bank of Ethiopia" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">Relationship to Account Holder</label>
        <input type="text" placeholder="e.g. Spouse, Parent, Business Partner" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
      </div>
      <button className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
        Save Details
      </button>
    </div>
  );
}

// ── Success screen ────────────────────────────────────────────────────────────

function SuccessScreen({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center max-w-lg mx-auto">
      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-200">
        <svg className="w-10 h-10 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Proof Submitted Successfully!</h2>
      <p className="text-slate-500 text-sm mb-2">
        Your payment proof has been securely submitted and is now under review by our team.
      </p>
      <p className="text-slate-400 text-xs mb-8">
        Verification typically takes 1–3 hours. You will receive an email once your account is activated.
      </p>
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5 w-full text-left mb-8 flex items-start gap-3">
        <svg className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
        </svg>
        <div>
          <p className="text-sm font-bold text-emerald-800">What happens next?</p>
          <ul className="mt-2 space-y-1 text-xs text-emerald-700">
            <li>• Our compliance team will verify your payment receipt</li>
            <li>• You will receive an email confirmation within 1–3 hours</li>
            <li>• Your investment account will be activated upon approval</li>
          </ul>
        </div>
      </div>
      <button
        onClick={onGoToDashboard}
        className="px-10 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function FundingUploadPage() {
  const router = useRouter();
  const params = useSearchParams();

  const method = params.get("method");
  const bankId = params.get("bankId") ?? params.get("walletId") ?? params.get("cryptoId") ?? params.get("otherId");
  const amount = params.get("amount");
  const txId = useRef(generateTxId()).current;

  const { name: methodName, type: accountType } = getMethodLabel(method, bankId);
  const displayAmount = formatAmount(amount);

  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [paymentSource, setPaymentSource] = useState<"own" | "other">("own");
  const [showThirdParty, setShowThirdParty] = useState(false);
  const [fileError, setFileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const addToast = useNotificationStore((s) => s.addToast);

  const handleFile = useCallback(
    (candidate: File) => {
      const err = validateProofFile(candidate);
      if (err) {
        setFileError(err);
        addToast({ title: "Invalid file", description: err, variant: "error" });
        return;
      }
      setFileError("");
      setFile(candidate);
    },
    [addToast]
  );

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async () => {
    if (!file) {
      const msg = "Please upload your payment proof before submitting.";
      setFileError(msg);
      addToast({ title: "No file selected", description: msg, variant: "error" });
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("proof", file);
      formData.append("depositAmount", amount ?? "1200");
      await submitProofViaApi(formData);
      broadcastDepositStatusChange();
      addToast({
        title: "Proof submitted!",
        description: "Your receipt is under review. You will be notified by email.",
        variant: "success",
      });
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      addToast({ title: "Submission failed", description: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Upload Bank Proof &amp; Register</h2>
          <p className="text-slate-500 text-sm">Upload your payment proof to complete your registration process.</p>
        </div>
        <button className="flex items-center gap-2 border border-blue-200 text-blue-600 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-50">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          How It Works
        </button>
      </div>

      {/* Progress */}
      <ProgressStepper success={success} onNavigate={(href) => router.push(href)} />

      {/* Success state */}
      {success ? (
        <SuccessScreen onGoToDashboard={() => router.push(ROUTES.DASHBOARD)} />
      ) : (
        <>
          {/* Main grid */}
          <div className="grid grid-cols-12 gap-8">
            {/* Left column */}
            <div className="col-span-12 lg:col-span-7 space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Upload Bank Payment Proof</h3>
                <p className="text-slate-500 text-sm mb-6">
                  Please upload a clear screenshot or photo of your bank payment receipt.
                </p>

                <DropZone
                  file={file}
                  dragActive={dragActive}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileChange={handleFileChange}
                  onRemove={() => setFile(null)}
                />

                {fileError && (
                  <p className="mt-2 text-xs text-red-600">{fileError}</p>
                )}

                {/* Instructions */}
                <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-6">
                  <div className="flex gap-3 mb-4">
                    <div className="bg-blue-100 p-1.5 rounded-full h-fit">
                      <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <h5 className="text-blue-900 font-bold text-sm">Important Instructions</h5>
                  </div>
                  <ul className="space-y-2">
                    {[
                      "Make sure the screenshot is clear and all details are visible.",
                      "The proof must match the payment amount and method selected.",
                      "Do not edit or crop the payment proof.",
                      "You will be notified once your proof is verified.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-xs text-slate-600">
                        <svg className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Payment source radio */}
                <div className="mt-8">
                  <label className="block text-sm font-bold text-slate-800 mb-4">Payment Made From</label>
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_source"
                        checked={paymentSource === "own"}
                        onChange={() => { setPaymentSource("own"); setShowThirdParty(false); }}
                        className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div>
                        <span className="block text-sm font-bold text-slate-800">From my own bank account</span>
                        <span className="block text-xs text-slate-500">The payment was made from my personal bank account.</span>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="payment_source"
                        checked={paymentSource === "other"}
                        onChange={() => setPaymentSource("other")}
                        className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                      <div>
                        <span className="block text-sm font-bold text-slate-800">From another person&apos;s bank account</span>
                        <span className="block text-xs text-slate-500">The payment was made from someone else&apos;s bank account.</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Third-party warning */}
                {paymentSource === "other" && (
                  <>
                    <div className="mt-6 bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                        </svg>
                        <p className="text-xs text-amber-800">
                          If payment is from another person&apos;s account, you must provide their details.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowThirdParty(!showThirdParty)}
                        className="text-blue-600 text-xs font-bold hover:underline whitespace-nowrap ml-3"
                      >
                        {showThirdParty ? "Hide" : "Add Details"}
                      </button>
                    </div>
                    <ThirdPartyForm visible={showThirdParty} onClose={() => setShowThirdParty(false)} />
                  </>
                )}
              </div>
            </div>

            {/* Right column — Payment Summary */}
            <div className="col-span-12 lg:col-span-5">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-fit">
                <div className="p-8 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">Payment Summary</h3>
                  </div>
                </div>
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="text-blue-600 font-bold text-right max-w-[180px]">{methodName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Account Type</span>
                    <span className="text-slate-800 font-medium">{accountType}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Deposit Amount</span>
                    <span className="text-emerald-600 font-bold text-lg">{displayAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="text-slate-800 font-medium">{txId}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Payment Date</span>
                    <span className="text-slate-800 font-medium">{NOW}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Currency</span>
                    <span className="text-slate-800 font-medium">USD - US Dollar</span>
                  </div>

                  {/* Secure status */}
                  <div className="mt-2 bg-emerald-50 border border-emerald-100 rounded-xl p-5 flex items-start gap-4">
                    <div className="bg-emerald-100 p-1.5 rounded-full shrink-0">
                      <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <div>
                      <h6 className="text-emerald-800 font-bold text-sm">Secure &amp; Verified</h6>
                      <p className="text-[11px] text-emerald-600 leading-normal">
                        Your payment proof is encrypted and will be securely verified by our team.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto mb-10">
            {/* Back button */}
            <button
              onClick={() => router.push(ROUTES.FUNDING)}
              className="flex items-center gap-2 px-6 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
              </svg>
              Back to Payment Details
            </button>

            {/* Verification notice */}
            <div className="flex-1 max-w-md bg-emerald-50/80 border border-emerald-100 rounded-xl p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h6 className="text-emerald-800 font-bold text-sm">Verification usually takes 1-3 hours</h6>
                <p className="text-[11px] text-emerald-600">You will receive an email once your account is activated.</p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex flex-col items-center">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-12 py-3.5 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Register &amp; Complete
                  </>
                )}
              </button>
              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                By clicking Register, you agree to our{" "}
                <a href="#" className="text-blue-600 font-bold hover:underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-blue-600 font-bold hover:underline">Privacy Policy</a>.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
