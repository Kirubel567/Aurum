"use client";

import { FileUp, Loader2, UploadCloud, X } from "lucide-react";
import { useCallback, useState } from "react";

import { broadcastDepositStatusChange } from "@/src/features/onboarding/lib/deposit-sync";
import {
  formatMaxProofSize,
  validateProofFile,
} from "@/src/features/onboarding/lib/deposit-limits";
import { submitProofViaApi } from "@/src/features/onboarding/services/deposit.service";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

interface ProofUploaderProps {
  onSubmitted: () => void;
  rejected?: boolean;
}

const ACCEPTED_EXTENSIONS = ".pdf,.jpg,.jpeg,.png,.webp";

function resolveUploadError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.toLowerCase().includes("too large")) {
      return `File is too large. Maximum upload size is ${formatMaxProofSize()}.`;
    }
    if (error.message.toLowerCase().includes("failed to fetch")) {
      return "Upload failed. Check your connection and try again.";
    }
    return error.message;
  }
  return "Submission failed. Please try again.";
}

export function ProofUploader({ onSubmitted, rejected }: ProofUploaderProps) {
  const addToast = useNotificationStore((state) => state.addToast);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notifyError = useCallback(
    (message: string) => {
      setError(message);
      addToast({
        title: "Upload failed",
        description: message,
        variant: "error",
      });
    },
    [addToast]
  );

  const handleFile = useCallback(
    (candidate: File) => {
      const validationError = validateProofFile(candidate);
      if (validationError) {
        notifyError(validationError);
        setFile(null);
        return;
      }
      setError("");
      setFile(candidate);
    },
    [notifyError]
  );

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file) {
      notifyError("Please upload your bank wire receipt before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("proof", file);
      await submitProofViaApi(formData);
      addToast({
        title: "Proof submitted",
        description:
          "Your receipt is under review. You will be notified by email once verified.",
        variant: "success",
      });
      broadcastDepositStatusChange();
      onSubmitted();
    } catch (err) {
      notifyError(resolveUploadError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#C5A059]/30 bg-[#C5A059]/10">
          <UploadCloud className="size-7 text-[#C5A059]" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">
          {rejected ? "Resubmit Payment Proof" : "Upload Wire Receipt"}
        </h2>
        <p className="mx-auto max-w-lg text-sm leading-6 text-white/60">
          {rejected
            ? "Your previous document could not be verified. Upload a clear image or PDF of your official bank transfer receipt."
            : "Securely upload an image or PDF of your bank wire transfer confirmation for sovereign audit review."}
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-8 text-center transition-colors",
          dragActive
            ? "border-[#C5A059] bg-[#C5A059]/10"
            : "border-white/15 bg-white/[0.02]"
        )}
      >
        <input
          id="proof-upload"
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="sr-only"
          onChange={(event) => {
            const selected = event.target.files?.[0];
            if (selected) handleFile(selected);
          }}
        />

        {!file ? (
          <label htmlFor="proof-upload" className="cursor-pointer">
            <FileUp className="mx-auto size-10 text-[#C5A059]" />
            <p className="mt-4 text-sm font-medium text-white">
              Drag & drop your receipt here
            </p>
            <p className="mt-1 text-xs text-white/45">
              PDF, JPG, PNG, or WEBP — max {formatMaxProofSize()}
            </p>
            <span className="mt-4 inline-flex h-10 items-center rounded-lg border border-[#C5A059]/35 px-4 text-xs font-semibold uppercase tracking-wide text-[#C5A059]">
              Browse Files
            </span>
          </label>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{file.name}</p>
              <p className="text-xs text-white/45">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="flex size-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              aria-label="Remove file"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="text-center text-sm text-[#EF4444]" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-2 rounded-xl",
          "bg-[#C5A059] text-sm font-semibold text-[#0B1221]",
          "transition-all hover:bg-[#d4b06a] active:scale-[0.99] disabled:opacity-70"
        )}
      >
        {submitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Submitting Verification...
          </>
        ) : (
          "Submit Verification"
        )}
      </button>
    </div>
  );
}
