"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, ArrowLeft, Shield, Clock } from "lucide-react";

import { broadcastDepositStatusChange } from "@/src/features/onboarding/lib/deposit-sync";
import { validateProofFile, formatMaxProofSize } from "@/src/features/onboarding/lib/deposit-limits";
import { submitProofViaApi } from "@/src/features/onboarding/services/deposit.service";
import { useNotificationStore } from "@/src/store/notification.store";
import { ROUTES } from "@/src/lib/constants/routes";
import { ETHIOPIAN_BANK_ACCOUNTS } from "@/src/features/onboarding/lib/ethiopian-banks";
import { cn } from "@/lib/utils";

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
    const labels: Record<string, string> = {
      wire: "International Wire Transfer",
      westernunion: "Western Union",
      moneygram: "MoneyGram",
    };
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

// ── Destination account data ──────────────────────────────────────────────────

const EWALLET_ACCOUNTS: Record<string, { holder: string; number: string; label: string }> = {
  telebirr: { holder: "Nathaniel Elias Misgane", number: "0901090348",    label: "TeleBirr" },
  cbebirr:  { holder: "Nathaniel Elias Misgane", number: "1000549712502", label: "CBE Birr" },
};

const CRYPTO_ACCOUNTS: Record<string, { address: string; network: string; label: string }> = {
  usdt: { address: "TQnGF3KsVQKYqNxgwm8fNWdmT7sJxzRkqP",        network: "TRON (TRC-20)",            label: "USDT" },
  btc:  { address: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", network: "Bitcoin Mainnet",          label: "Bitcoin (BTC)" },
  eth:  { address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",  network: "Ethereum Mainnet (ERC-20)", label: "Ethereum (ETH)" },
};

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async () => {
    try { await navigator.clipboard.writeText(text); } catch { /* silent */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handle}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0",
        copied
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
      )}
    >
      {copied ? <><Check className="size-3" /> Copied</> : <><Copy className="size-3" /> Copy</>}
    </button>
  );
}

// ── Account info row ──────────────────────────────────────────────────────────

function InfoRow({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0 gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-all">{value}</p>
      </div>
      {copy && <CopyButton text={value} />}
    </div>
  );
}

// ── Step 1 — Transfer destination ─────────────────────────────────────────────

function TransferDestinationStep({
  method,
  id,
  displayAmount,
}: {
  method: string | null;
  id: string | null;
  displayAmount: string;
}) {
  // Bank
  if (method === "bank" || !method) {
    const bank = ETHIOPIAN_BANK_ACCOUNTS.find((b) => b.id === id) ?? ETHIOPIAN_BANK_ACCOUNTS[0];
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Transfer Funds to This Account</h3>
            <p className="text-xs text-slate-500 mt-0.5">Make your bank transfer to the details below, then proceed to step 2.</p>
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-2">
          <InfoRow label="Bank" value={bank.label} />
          <InfoRow label="Account Holder" value={bank.accountHolder} />
          <InfoRow label="Account Number" value={bank.accountNumber} copy />
        </div>
        <div className="mx-5 sm:mx-6 mb-5 mt-2 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs text-slate-600">
            Transfer exactly <span className="font-bold text-blue-600">{displayAmount}</span> to this account. Keep your receipt — you will need to upload it in step 2.
          </p>
        </div>
      </div>
    );
  }

  // E-Wallet
  if (method === "ewallet") {
    const wallet = EWALLET_ACCOUNTS[id ?? "telebirr"] ?? EWALLET_ACCOUNTS.telebirr;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Send via {wallet.label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Send the funds to the mobile number below, then proceed to step 2.</p>
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-2">
          <InfoRow label="Service" value={wallet.label} />
          <InfoRow label="Recipient Name" value={wallet.holder} />
          <InfoRow label="Phone / Account Number" value={wallet.number} copy />
        </div>
        <div className="mx-5 sm:mx-6 mb-5 mt-2 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs text-slate-600">
            Send exactly <span className="font-bold text-slate-800">{displayAmount}</span> to the number above, then upload a screenshot of the confirmation in step 2.
          </p>
        </div>
      </div>
    );
  }

  // Crypto
  if (method === "crypto") {
    const crypto = CRYPTO_ACCOUNTS[id ?? "usdt"] ?? CRYPTO_ACCOUNTS.usdt;
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Send {crypto.label} to This Wallet</h3>
            <p className="text-xs text-slate-500 mt-0.5">Copy the address below and send exactly on the correct network.</p>
          </div>
        </div>
        <div className="px-5 sm:px-6 pb-2">
          <InfoRow label="Network" value={crypto.network} />
          <InfoRow label="Wallet Address" value={crypto.address} copy />
        </div>
        <div className="mx-5 sm:mx-6 mb-3 mt-2 flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
          <p className="text-xs text-red-700">
            <span className="font-bold">Critical:</span> Only send on the <span className="font-bold">{crypto.network}</span> network. Sending on the wrong network results in permanent, unrecoverable loss of funds.
          </p>
        </div>
        <div className="mx-5 sm:mx-6 mb-5 flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
          <p className="text-xs text-slate-600">
            Send exactly <span className="font-bold text-slate-800">{displayAmount}</span> worth of {crypto.label}. Upload your transaction screenshot in step 2.
          </p>
        </div>
      </div>
    );
  }

  // Other
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-slate-100">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">1</div>
        <div>
          <h3 className="text-base font-bold text-slate-900">Contact Support for Receiver Details</h3>
          <p className="text-xs text-slate-500 mt-0.5">Our team will provide you with the correct transfer details.</p>
        </div>
      </div>
      <div className="p-5 sm:p-6">
        <p className="text-sm text-slate-600 mb-4">
          For International Wire Transfer, Western Union, or MoneyGram — contact our support team before making the transfer to get the correct receiver details.
        </p>
        <button
          onClick={() => window.open(ROUTES.SUPPORT, "_blank")}
          className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
        >
          Contact Support
        </button>
      </div>
    </div>
  );
}

// ── Step 2 — File drop zone ───────────────────────────────────────────────────

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
      <div className="border-2 border-dashed border-emerald-200 rounded-xl bg-emerald-50/40 p-6 flex flex-col items-center text-center">
        {previewUrl ? (
          <img src={previewUrl} alt="Proof preview" className="max-h-40 rounded-lg mb-4 object-contain border border-slate-200" />
        ) : (
          <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </div>
        )}
        <p className="font-bold text-slate-800 text-sm">{file.name}</p>
        <p className="text-xs text-slate-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · Ready to submit</p>
        <div className="flex items-center gap-4 mt-4">
          <button onClick={onRemove} className="text-xs font-semibold text-red-500 hover:underline">Remove</button>
          <button onClick={() => inputRef.current?.click()} className="text-xs font-semibold text-blue-600 hover:underline">Replace</button>
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
      onClick={() => inputRef.current?.click()}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 flex flex-col items-center text-center transition-all cursor-pointer",
        dragActive ? "border-blue-400 bg-blue-50" : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
      )}
    >
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center mb-4">
        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-slate-700">Drag &amp; drop your file here</p>
      <p className="text-xs text-slate-400 mt-1 mb-4">PNG, JPG, JPEG or PDF · Max {formatMaxProofSize()}</p>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
        className="px-5 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
      >
        Browse File
      </button>
      <input ref={inputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={onFileChange} />
    </div>
  );
}

// ── Third-party form ──────────────────────────────────────────────────────────

function ThirdPartyForm({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  if (!visible) return null;
  return (
    <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h6 className="text-sm font-bold text-slate-800">Third-Party Account Details</h6>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
          </svg>
        </button>
      </div>
      {[
        { label: "Account Holder Name", placeholder: "Full legal name" },
        { label: "Bank Name", placeholder: "e.g. Commercial Bank of Ethiopia" },
        { label: "Relationship to Account Holder", placeholder: "e.g. Spouse, Parent, Business Partner" },
      ].map((f) => (
        <div key={f.label}>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
          <input type="text" placeholder={f.placeholder} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
        </div>
      ))}
      <button className="w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">Save Details</button>
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
        Your payment proof has been securely submitted and is now under review.
      </p>
      <p className="text-slate-400 text-xs mb-8">
        Verification typically takes 1–3 hours. You will receive an email once your account is activated.
      </p>
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 w-full text-left mb-8 flex items-start gap-3">
        <Clock className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-slate-800">What happens next?</p>
          <ul className="mt-2 space-y-1 text-xs text-slate-500">
            <li>• Our compliance team will verify your payment receipt</li>
            <li>• You will receive an email confirmation within 1–3 hours</li>
            <li>• Your investment account will be activated upon approval</li>
          </ul>
        </div>
      </div>
      <button
        onClick={onGoToDashboard}
        className="px-10 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
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

  const method   = params.get("method");
  const bankId   = params.get("bankId") ?? params.get("walletId") ?? params.get("cryptoId") ?? params.get("otherId");
  const amount   = params.get("amount");
  const txId     = useRef(generateTxId()).current;

  const { name: methodName, type: accountType } = getMethodLabel(method, bankId);
  const displayAmount = formatAmount(amount);

  const [file, setFile]                     = useState<File | null>(null);
  const [dragActive, setDragActive]         = useState(false);
  const [paymentSource, setPaymentSource]   = useState<"own" | "other">("own");
  const [showThirdParty, setShowThirdParty] = useState(false);
  const [fileError, setFileError]           = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [success, setSuccess]               = useState(false);

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

  const handleDragOver  = (e: React.DragEvent) => { e.preventDefault(); setDragActive(true); };
  const handleDragLeave = () => setDragActive(false);
  const handleDrop      = (e: React.DragEvent) => {
    e.preventDefault(); setDragActive(false);
    const f = e.dataTransfer.files[0]; if (f) handleFile(f);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) handleFile(f);
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
      addToast({ title: "Proof submitted!", description: "Your receipt is under review.", variant: "success" });
      setSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
      addToast({ title: "Submission failed", description: msg, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 bg-[#F8FAFC]">

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => router.push(ROUTES.FUNDING)}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition-colors shrink-0"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-none">Upload Payment Proof</h2>
          <p className="text-slate-500 text-xs mt-1">
            {methodName} · {displayAmount}
          </p>
        </div>
      </div>

      {success ? (
        <SuccessScreen onGoToDashboard={() => router.push(ROUTES.DASHBOARD)} />
      ) : (
        <div className="grid grid-cols-12 gap-5 sm:gap-8 items-start">

          {/* ── Left column — steps ─────────────────────────────────────────── */}
          <div className="col-span-12 lg:col-span-7 space-y-5">

            {/* Step 1 — transfer destination */}
            <TransferDestinationStep method={method} id={bankId} displayAmount={displayAmount} />

            {/* Step 2 — upload proof */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-5 sm:p-6 border-b border-slate-100">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold shrink-0">2</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Upload Payment Receipt</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Upload a clear photo or screenshot of your payment confirmation.</p>
                </div>
              </div>

              <div className="p-5 sm:p-6 space-y-5">
                <DropZone
                  file={file}
                  dragActive={dragActive}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onFileChange={handleFileChange}
                  onRemove={() => setFile(null)}
                />
                {fileError && <p className="text-xs text-red-600">{fileError}</p>}

                {/* Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    "Screenshot must be clear and unedited",
                    "Amount must match the deposit entered",
                    "Crop or blur of any details is not accepted",
                    "You will be notified once verified",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                        <svg className="w-2.5 h-2.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 leading-relaxed">{item}</p>
                    </div>
                  ))}
                </div>

                {/* Payment source */}
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-sm font-bold text-slate-800 mb-3">Payment Made From</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(["own", "other"] as const).map((val) => (
                      <label
                        key={val}
                        onClick={() => { setPaymentSource(val); if (val === "own") setShowThirdParty(false); }}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                          paymentSource === val
                            ? "border-blue-600 bg-blue-50/40"
                            : "border-slate-200 hover:border-slate-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center",
                          paymentSource === val ? "border-blue-600 bg-blue-600" : "border-slate-300"
                        )}>
                          {paymentSource === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {val === "own" ? "My own account" : "Someone else's account"}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {val === "own"
                              ? "Payment is from my personal bank account"
                              : "Payment is from another person's account"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {paymentSource === "other" && (
                  <>
                    <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <p className="text-xs text-slate-600">Third-party payments require additional details.</p>
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
          </div>

          {/* ── Right column — summary + submit ──────────────────────────────── */}
          <div className="col-span-12 lg:col-span-5 space-y-4">

            {/* Summary card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Payment Summary</h3>
              </div>
              <div className="px-5 sm:px-6 py-2 divide-y divide-slate-100">
                {[
                  { label: "Method",     value: methodName },
                  { label: "Type",       value: accountType },
                  { label: "Amount",     value: displayAmount,  highlight: true },
                  { label: "TX Ref",     value: txId },
                  { label: "Date",       value: NOW },
                  { label: "Currency",   value: "USD — US Dollar" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-3 gap-4">
                    <span className="text-xs font-medium text-slate-400 shrink-0">{row.label}</span>
                    <span className={cn(
                      "text-xs font-semibold text-right",
                      row.highlight ? "text-emerald-600 text-sm font-bold" : "text-slate-700"
                    )}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust pills */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
                <Shield className="size-4 text-emerald-500 shrink-0" />
                <p className="text-[10px] font-semibold text-slate-600 leading-tight">Encrypted &amp; Secure</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2.5">
                <Clock className="size-4 text-blue-500 shrink-0" />
                <p className="text-[10px] font-semibold text-slate-600 leading-tight">1–3 hour review time</p>
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-60"
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
                  Submit Proof
                </>
              )}
            </button>

            <p className="text-center text-[10px] text-slate-400">
              By submitting, you agree to our{" "}
              <a href={ROUTES.LEGAL} className="text-blue-600 font-semibold hover:underline">Terms of Service</a>
              {" "}and{" "}
              <a href={ROUTES.LEGAL} className="text-blue-600 font-semibold hover:underline">Privacy Policy</a>.
            </p>

            {/* Back link */}
            <div className="flex justify-center pt-1 pb-6">
              <button
                onClick={() => router.push(ROUTES.FUNDING)}
                className="flex items-center gap-1.5 text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
              >
                <ArrowLeft className="size-3" />
                Back to Payment Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
