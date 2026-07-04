"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";

import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuthStore } from "@/src/store/auth.store";
import { cn } from "@/lib/utils";

import { BrandSidebar } from "../../onboarding/_components/BrandSidebar";
import { RegisterHeader } from "../../onboarding/_components/RegisterHeader";
import { FieldLabel, IconInput } from "../../onboarding/_components/IconField";

interface ResetPasswordFormProps {
  tokenHash: string;
}

export function ResetPasswordForm({ tokenHash }: ResetPasswordFormProps) {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const missingToken = !tokenHash;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!password || !confirmPassword) {
      setError("Both password fields are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokenHash, password }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        session?: DepositSession;
        error?: string;
      };

      if (!response.ok || !payload.session) {
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }

      useDepositStore.getState().reset();
      setSession(payload.session);
      router.push(
        payload.session.user.role === "investor"
          ? ROUTES.DASHBOARD
          : ROUTES.ADMIN_DASHBOARD
      );
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="font-(family-name:--font-jakarta) min-h-screen bg-[#020617]">
      <RegisterHeader variant="login" />

      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col lg:flex-row">
        <BrandSidebar />

        <section className="flex w-full flex-1 items-center justify-center bg-[#F8FAFC] px-5 py-10 sm:px-8 lg:w-[60%] lg:px-12 lg:py-16">
          <div
            className={cn(
              "w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white",
              "p-7 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.14)] sm:p-9"
            )}
          >
            <div className="mb-7 text-center lg:text-left">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                Investor Portal
              </p>
              <h2 className="text-[1.6rem] font-bold tracking-tight text-[#050B14]">
                Set a New Password
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Choose a strong password for your account.
              </p>
            </div>

            {missingToken ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
                  <p className="text-center text-sm text-[#EF4444]" role="alert">
                    This reset link is invalid or incomplete. Please request a new
                    one.
                  </p>
                </div>
                <p className="text-center text-sm text-slate-500">
                  <Link
                    href={ROUTES.FORGOT_PASSWORD}
                    className="font-semibold text-[#050B14] hover:underline"
                  >
                    Request a new reset link
                  </Link>
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <FieldLabel required>New Password</FieldLabel>
                  <IconInput
                    type="password"
                    icon={<Lock className="size-4" />}
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel required>Confirm New Password</FieldLabel>
                  <IconInput
                    type="password"
                    icon={<Lock className="size-4" />}
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5">
                    <p className="text-center text-sm text-[#EF4444]" role="alert">
                      {error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#050B14] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0d1f3c] active:scale-[0.98] disabled:opacity-70 sm:h-12"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Set New Password"
                  )}
                </button>

                <p className="text-center text-sm text-slate-500">
                  Remembered your password?{" "}
                  <Link
                    href={ROUTES.LOGIN}
                    className="font-semibold text-[#050B14] hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
