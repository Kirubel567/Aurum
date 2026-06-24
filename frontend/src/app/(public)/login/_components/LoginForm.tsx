"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";

import { loginViaApi } from "@/src/features/onboarding/services/deposit.service";
import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuthStore } from "@/src/store/auth.store";
import { cn } from "@/lib/utils";

import { BrandSidebar } from "../../onboarding/_components/BrandSidebar";
import { RegisterHeader } from "../../onboarding/_components/RegisterHeader";
import { FieldLabel, IconInput } from "../../onboarding/_components/IconField";

export function LoginForm() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setLoading = useAuthStore((s) => s.setLoading);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    setLoading(true);
    try {
      useDepositStore.getState().reset();
      const { session } = await loginViaApi({ email, password });
      setSession(session);
      router.push(
        session.user.role === "admin" ? ROUTES.ADMIN : ROUTES.DASHBOARD
      );
    } catch {
      setError("Invalid credentials. Please try again.");
    } finally {
      setSubmitting(false);
      setLoading(false);
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
            {/* Heading */}
            <div className="mb-7 text-center lg:text-left">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                Investor Portal
              </p>
              <h2 className="text-[1.6rem] font-bold tracking-tight text-[#050B14]">
                Welcome Back
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Sign in to access your investor portal.
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

              <div className="space-y-1.5">
                <FieldLabel required>Password</FieldLabel>
                <IconInput
                  type="password"
                  icon={<Lock className="size-4" />}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#050B14] text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0d1f3c] active:scale-[0.98] disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>

              <p className="text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link
                  href={ROUTES.ONBOARDING}
                  className="font-semibold text-[#050B14] hover:underline"
                >
                  Create your account
                </Link>
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
