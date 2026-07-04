"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, MailCheck } from "lucide-react";

import { ROUTES } from "@/src/lib/constants/routes";
import { cn } from "@/lib/utils";

import { BrandSidebar } from "../../onboarding/_components/BrandSidebar";
import { RegisterHeader } from "../../onboarding/_components/RegisterHeader";
import { FieldLabel, IconInput } from "../../onboarding/_components/IconField";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Email is required.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
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
            {sent ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[#C5A059]/30 bg-[#C5A059]/10">
                  <MailCheck className="size-8 text-[#C5A059]" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-[1.4rem] font-bold tracking-tight text-[#050B14]">
                    Check Your Email
                  </h2>
                  <p className="text-sm leading-6 text-slate-500">
                    If an account exists for{" "}
                    <span className="font-semibold text-slate-800">{email}</span>, a
                    password reset link is on its way. The link expires in 1 hour.
                  </p>
                </div>
                <p className="text-center text-sm text-slate-500">
                  <Link
                    href={ROUTES.LOGIN}
                    className="font-semibold text-[#050B14] hover:underline"
                  >
                    Back to sign in
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <div className="mb-7 text-center lg:text-left">
                  <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                    Investor Portal
                  </p>
                  <h2 className="text-[1.6rem] font-bold tracking-tight text-[#050B14]">
                    Forgot Password
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-500">
                    Enter your email and we&apos;ll send you a link to reset your
                    password.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <FieldLabel required>Email Address</FieldLabel>
                    <IconInput
                      type="email"
                      icon={<Mail className="size-4" />}
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
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
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
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
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
