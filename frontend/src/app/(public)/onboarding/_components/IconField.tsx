"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

export const inputClassName =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-0 text-sm text-[#050B14] outline-none transition-all placeholder:text-slate-400 focus:border-[#e9c349] focus:ring-2 focus:ring-[#e9c349]/20";

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  error?: string;
}

export function IconInput({
  icon,
  error,
  className,
  type,
  ...props
}: IconInputProps) {
  // Password fields get a built-in show/hide toggle so users can confirm what
  // they typed. When revealed, the input becomes a normal text field.
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && revealed ? "text" : type;

  return (
    <div className="space-y-1.5">
      <div className="group relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#e9c349]">
          {icon}
        </span>
        <input
          type={effectiveType}
          className={cn(
            inputClassName,
            isPassword ? "pl-11 pr-11" : "pl-11 pr-4",
            error && "border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]/20",
            className
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            className="absolute top-1/2 right-3.5 -translate-y-1/2 text-slate-400 transition-colors hover:text-[#050B14]"
            aria-label={revealed ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-[#EF4444]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

interface IconSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon: React.ReactNode;
  error?: string;
  children: React.ReactNode;
}

export function IconSelect({
  icon,
  error,
  className,
  children,
  ...props
}: IconSelectProps) {
  return (
    <div className="space-y-1.5">
      <div className="group relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 z-10 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <select
          className={cn(
            inputClassName,
            "appearance-none pl-11 pr-10",
            error && "border-[#EF4444]",
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && (
        <p className="text-xs font-medium text-[#EF4444]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-[13px] font-semibold text-[#0f172a]">
      {children}
      {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
    </label>
  );
}
