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
    <div className="relative mb-7 flex items-start justify-between gap-2">
      {/* Connector line */}
      <div className="absolute top-[18px] right-8 left-8 z-0 h-px bg-slate-200" />

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
                "flex size-9 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                isActive && "bg-[#050B14] text-white shadow-md shadow-black/15 ring-4 ring-[#050B14]/10",
                isCompleted && "bg-[#e9c349] text-[#050B14]",
                !isActive && !isCompleted && "border border-slate-200 bg-white text-slate-400"
              )}
            >
              {isCompleted ? (
                <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                  <path d="M1 5L4.5 8.5L12 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={cn(
                "text-center text-[11px] font-semibold tracking-wide transition-colors",
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
