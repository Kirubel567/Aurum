"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail } from "lucide-react";

import { login } from "@/src/services/api/auth.api";
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
      const session = await login({ email, password });
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
    <div className="font-[family-name:var(--font-jakarta)] min-h-screen bg-[#0e141a]">
      <RegisterHeader variant="login" />

      <main className="flex min-h-[calc(100vh-5rem)] w-full flex-col lg:flex-row">
        <BrandSidebar />

        <section className="flex w-full flex-1 items-center justify-center bg-[#F8FAFC] p-6 lg:w-[60%] lg:p-16">
          <div
            className={cn(
              "w-full max-w-lg rounded-[32px] border border-slate-200 bg-white",
              "p-8 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] lg:p-12"
            )}
          >
            <div className="mb-10 text-center lg:text-left">
              <h2 className="text-2xl font-extrabold tracking-tight text-[#050B14] sm:text-3xl">
                Welcome Back
              </h2>
              <p className="mt-2 text-base text-slate-500">
                Sign in to access your investor portal.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <FieldLabel required>Email Address</FieldLabel>
                <IconInput
                  type="email"
                  icon={<Mail className="size-5" />}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <FieldLabel required>Password</FieldLabel>
                <IconInput
                  type="password"
                  icon={<Lock className="size-5" />}
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#050B14] py-4 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:bg-[#0a1628] active:scale-[0.98] disabled:opacity-70"
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
