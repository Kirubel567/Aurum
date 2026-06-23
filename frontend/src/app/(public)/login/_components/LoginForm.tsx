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
  const setDepositStatus = useDepositStore((s) => s.setDepositStatus);
  const setDepositHydrated = useDepositStore((s) => s.setHydrated);

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
      const { session } = await loginViaApi({ email, password });
      setSession(session);
      setDepositStatus(session.depositStatus);
      setDepositHydrated(true);
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

        <section className="flex w-full flex-1 items-center justify-center bg-[#F8FAFC] p-5 sm:p-6 lg:w-[60%] lg:p-10">
          <div
            className={cn(
              "w-full max-w-md rounded-[28px] border border-slate-200/90 bg-white",
              "p-6 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.18)] sm:p-8"
            )}
          >
            <div className="mb-8 text-center lg:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-[#050B14] sm:text-3xl">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign in to access your investor portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <FieldLabel required>Email Address</FieldLabel>
                <IconInput
                  type="email"
                  icon={<Mail className="size-4" />}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
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
                <p className="text-center text-sm text-[#EF4444]" role="alert">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#050B14] text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:bg-[#0a1628] active:scale-[0.98] disabled:opacity-70"
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
