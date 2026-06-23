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
    <div className="relative mb-8 flex items-start justify-between gap-3 px-2">
      <div className="absolute top-4 right-7 left-7 z-0 h-px bg-slate-200" />

      {REGISTRATION_STEPS.map((step) => {
        const isActive = step.id === activeStep;
        const isCompleted = step.id < activeStep;

        return (
          <div
            key={step.id}
            className="relative z-10 flex flex-1 flex-col items-center gap-2"
          >
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
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
                "text-center text-xs font-semibold transition-colors sm:text-sm",
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
