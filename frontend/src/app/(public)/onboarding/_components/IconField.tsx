"use client";

import { cn } from "@/lib/utils";

export const inputClassName =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-0 text-sm text-[#050B14] outline-none transition-all placeholder:text-sm placeholder:text-slate-400 focus:border-[#e9c349] focus:ring-2 focus:ring-[#e9c349]/20";

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode;
  error?: string;
}

export function IconInput({
  icon,
  error,
  className,
  ...props
}: IconInputProps) {
  return (
    <div className="space-y-1">
      <div className="group relative">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[#e9c349]">
          {icon}
        </span>
        <input
          className={cn(
            inputClassName,
            "pl-11 pr-4",
            error && "border-[#EF4444]",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs text-[#EF4444]" role="alert">
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
    <div className="space-y-1">
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
        <p className="text-xs text-[#EF4444]" role="alert">
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
    <label className="block text-sm font-semibold text-[#0f172a]">
      {children}
      {required && <span className="ml-0.5 text-[#EF4444]">*</span>}
    </label>
  );
}
