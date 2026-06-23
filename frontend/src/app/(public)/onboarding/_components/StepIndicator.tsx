"use client";

import { cn } from "@/lib/utils";
import {
  REGISTRATION_STEPS,
  type RegistrationStep,
} from "../_types/registration";

interface StepIndicatorProps {
  activeStep: RegistrationStep;
}

export function StepIndicator({ activeStep }: StepIndicatorProps) {
  return (
    <div className="relative mb-12 flex items-center justify-between px-4">
      <div className="absolute top-5 right-8 left-8 z-0 h-px bg-slate-200" />

      {REGISTRATION_STEPS.map((step) => {
        const isActive = step.id === activeStep;
        const isCompleted = step.id < activeStep;

        return (
          <div
            key={step.id}
            className="relative z-10 flex flex-col items-center gap-3"
          >
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-full text-sm font-bold transition-all duration-300",
                isActive &&
                  "bg-[#050B14] text-white shadow-lg shadow-black/10",
                isCompleted &&
                  "bg-[#e9c349] text-[#050B14]",
                !isActive &&
                  !isCompleted &&
                  "border border-slate-200 bg-slate-100 text-slate-400"
              )}
            >
              {isCompleted ? "✓" : step.id}
            </div>
            <span
              className={cn(
                "text-sm font-semibold transition-colors",
                isActive && "text-[#050B14]",
                isCompleted && "text-[#050B14]",
                !isActive && !isCompleted && "text-slate-400"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
