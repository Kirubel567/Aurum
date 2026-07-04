"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import { submitRegistration } from "@/src/features/onboarding/services/onboarding.service";
import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import {
  contactInfoSchema,
  personalInfoSchema,
  securitySchema,
} from "@/src/features/onboarding/schemas/registrationSchema";
import { ROUTES } from "@/src/lib/constants/routes";
import { useAuthStore } from "@/src/store/auth.store";
import { useNotificationStore } from "@/src/store/notification.store";
import { cn } from "@/lib/utils";

import {
  INITIAL_REGISTRATION_DATA,
  type RegistrationData,
  type RegistrationStep,
} from "../_types/registration";
import { BrandSidebar } from "./BrandSidebar";
import { RegisterHeader } from "./RegisterHeader";
import { SecurityBanner } from "./SecurityBanner";
import { StepIndicator } from "./StepIndicator";
import { ContactInfoStep } from "./forms/ContactInfoStep";
import { PersonalInfoStep } from "./forms/PersonalInfoStep";
import { SecurityStep } from "./forms/SecurityStep";

const STEP_TITLES: Record<RegistrationStep, { title: string; subtitle: string }> = {
  1: {
    title: "Create Your Account",
    subtitle: "Join now and start your investment journey.",
  },
  2: {
    title: "Contact Information",
    subtitle: "Tell us where we can reach you and verify your identity.",
  },
  3: {
    title: "Secure Your Account",
    subtitle: "Set a strong password and enable additional protection.",
  },
};

export function OnboardingWizard() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const setDepositStatus = useDepositStore((s) => s.setDepositStatus);
  const setEmailVerified = useDepositStore((s) => s.setEmailVerified);
  const setDepositHydrated = useDepositStore((s) => s.setHydrated);
  const addToast = useNotificationStore((s) => s.addToast);

  const [step, setStep] = useState<RegistrationStep>(1);
  const [data, setData] = useState<RegistrationData>(INITIAL_REGISTRATION_DATA);
  const [errors, setErrors] = useState<
    Partial<Record<keyof RegistrationData, string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    field: keyof RegistrationData,
    value: string | boolean
  ) => {
    setData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validateStep = (currentStep: RegistrationStep): boolean => {
    if (currentStep === 1) {
      const result = personalInfoSchema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof RegistrationData, string>> = {};
        result.error.issues.forEach((issue) => {
          const key = issue.path[0] as keyof RegistrationData;
          fieldErrors[key] = issue.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }

    if (currentStep === 2) {
      const result = contactInfoSchema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof RegistrationData, string>> = {};
        result.error.issues.forEach((issue) => {
          const key = issue.path[0] as keyof RegistrationData;
          fieldErrors[key] = issue.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }

    if (currentStep === 3) {
      const result = securitySchema.safeParse(data);
      if (!result.success) {
        const fieldErrors: Partial<Record<keyof RegistrationData, string>> = {};
        result.error.issues.forEach((issue) => {
          const key = issue.path[0] as keyof RegistrationData;
          fieldErrors[key] = issue.message;
        });
        setErrors(fieldErrors);
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const handleContinue = async () => {
    if (!validateStep(step)) return;

    if (step < 3) {
      setStep((s) => (s + 1) as RegistrationStep);
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitRegistration(data);
      setSession(result.session);
      setDepositStatus(result.session.depositStatus);
      setEmailVerified(result.session.emailVerified ?? false);
      setDepositHydrated(true);
      if (result.verificationEmailSent === false) {
        addToast({
          title: "Account created",
          description:
            "We couldn't send the verification email — use the resend button on the next screen.",
          variant: "warning",
        });
      } else {
        addToast({
          title: "Account created",
          description: "Complete your deposit verification to access the portal.",
          variant: "success",
        });
      }
      router.push(ROUTES.DASHBOARD);
    } catch (err) {
      addToast({
        title: "Registration failed",
        description:
          err instanceof Error && err.message
            ? err.message
            : "Please try again or contact support.",
        variant: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as RegistrationStep);
      setErrors({});
    }
  };

  const { title, subtitle } = STEP_TITLES[step];

  return (
    <div className="font-(family-name:--font-jakarta) min-h-screen bg-[#020617] text-[#dde3eb]">
      <RegisterHeader />

      <main className="flex min-h-[calc(100vh-4rem)] w-full flex-col lg:flex-row">
        <BrandSidebar />

        <section className="flex w-full flex-1 items-start justify-center bg-[#F8FAFC] px-5 py-10 sm:px-8 lg:w-[60%] lg:items-center lg:px-12 lg:py-12">
          <div
            className={cn(
              "w-full max-w-2xl rounded-2xl border border-slate-200 bg-white",
              "p-7 shadow-[0_8px_40px_-12px_rgba(15,23,42,0.14)] sm:p-9"
            )}
          >
            {/* Step header */}
            <div className="mb-6 border-b border-slate-100 pb-6">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C5A059]">
                Step {step} of 3
              </p>
              <h2 className="text-[1.5rem] font-bold tracking-tight text-[#050B14] sm:text-[1.65rem]">
                {title}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            </div>

            <StepIndicator activeStep={step} />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleContinue();
              }}
              className="space-y-5"
            >
              {step === 1 && (
                <PersonalInfoStep
                  data={data}
                  errors={errors}
                  onChange={handleChange}
                />
              )}
              {step === 2 && (
                <ContactInfoStep
                  data={data}
                  errors={errors}
                  onChange={handleChange}
                />
              )}
              {step === 3 && (
                <SecurityStep
                  data={data}
                  errors={errors}
                  onChange={handleChange}
                />
              )}

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                {step > 1 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="order-last flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-6 text-sm font-semibold text-[#050B14] transition-all hover:bg-slate-50 active:scale-[0.98] sm:order-first sm:h-12"
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </button>
                )}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#050B14] py-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#0d1f3c] active:scale-[0.98] disabled:opacity-70 sm:flex-1 sm:py-0 sm:h-12"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Creating account...
                    </>
                  ) : step === 3 ? (
                    "Create Account"
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>

              {step === 1 && (
                <p className="text-center text-xs text-slate-500">
                  By creating an account, you agree to our{" "}
                  <a href="#" className="font-semibold text-[#050B14] hover:underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="#" className="font-semibold text-[#050B14] hover:underline">
                    Privacy Policy
                  </a>
                  .
                </p>
              )}

              {step === 1 && <SecurityBanner />}
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}
