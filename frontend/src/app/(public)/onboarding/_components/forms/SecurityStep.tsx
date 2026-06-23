"use client";

import { useState } from "react";
import { Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";
import type { RegistrationData } from "../../_types/registration";
import { FieldLabel, IconInput } from "../IconField";

interface SecurityStepProps {
  data: RegistrationData;
  errors: Partial<Record<keyof RegistrationData, string>>;
  onChange: (field: keyof RegistrationData, value: string | boolean) => void;
}

export function SecurityStep({
  data,
  errors,
  onChange,
}: SecurityStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FieldLabel required>Password</FieldLabel>
          <div className="group relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#e9c349]">
              <Lock className="size-5" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              value={data.password}
              onChange={(e) => onChange("password", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white py-3.5 pr-12 pl-12 text-[#050B14] outline-none transition-all focus:border-[#e9c349] focus:ring-2 focus:ring-[#e9c349]/20",
                errors.password && "border-[#EF4444]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-[#050B14]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-[#EF4444]">{errors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <FieldLabel required>Confirm Password</FieldLabel>
          <div className="group relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#e9c349]">
              <Lock className="size-5" />
            </span>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Confirm your password"
              value={data.confirmPassword}
              onChange={(e) => onChange("confirmPassword", e.target.value)}
              className={cn(
                "w-full rounded-xl border border-slate-200 bg-white py-3.5 pr-12 pl-12 text-[#050B14] outline-none transition-all focus:border-[#e9c349] focus:ring-2 focus:ring-[#e9c349]/20",
                errors.confirmPassword && "border-[#EF4444]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400 hover:text-[#050B14]"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-[#EF4444]">{errors.confirmPassword}</p>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/80 p-4",
          data.twoFactorEnabled && "border-[#e9c349]/30 bg-[#e9c349]/5"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-[#e9c349]/15 p-2">
            <ShieldCheck className="size-5 text-[#e9c349]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#050B14]">
              Enable Two-Factor Authentication
            </p>
            <p className="text-xs text-slate-500">
              Add an extra layer of security to your account
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={data.twoFactorEnabled}
          onClick={() => onChange("twoFactorEnabled", !data.twoFactorEnabled)}
          className={cn(
            "relative h-7 w-12 rounded-full transition-colors",
            data.twoFactorEnabled ? "bg-[#050B14]" : "bg-slate-300"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-6 rounded-full bg-white shadow transition-transform",
              data.twoFactorEnabled && "translate-x-5"
            )}
          />
        </button>
      </div>
    </div>
  );
}
