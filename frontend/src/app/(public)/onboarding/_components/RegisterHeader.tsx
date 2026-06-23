"use client";

import Link from "next/link";
import { Building2, ChevronDown, Globe } from "lucide-react";

import { ROUTES } from "@/src/lib/constants/routes";
import { cn } from "@/lib/utils";

interface RegisterHeaderProps {
  className?: string;
  variant?: "register" | "login";
}

export function RegisterHeader({
  className,
  variant = "register",
}: RegisterHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 flex h-20 w-full items-center justify-between border-b border-[#45474b] bg-[#050B14] px-6 lg:px-16",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded bg-[#e9c349]">
          <Building2 className="size-5 text-[#050B14]" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-extrabold tracking-tight text-[#e9c349] sm:text-xl">
          Aurum Sovereign Capital
        </span>
      </div>

      <div className="flex items-center gap-4 sm:gap-6">
        <span className="hidden text-sm text-[#c5c6cc] sm:inline">
          {variant === "register"
            ? "Already have an account?"
            : "Don't have an account?"}
        </span>
        <Link
          href={variant === "register" ? ROUTES.LOGIN : ROUTES.ONBOARDING}
          className="rounded-lg border border-[#e9c349] px-5 py-2 text-sm font-bold text-[#e9c349] transition-all duration-200 hover:bg-[#e9c349]/10 active:scale-95"
        >
          {variant === "register" ? "Login" : "Register"}
        </Link>
        <button
          type="button"
          className="flex items-center gap-1 text-sm font-semibold text-[#c5c6cc] transition-colors hover:text-[#e9c349]"
        >
          <Globe className="size-4" />
          <span>EN</span>
          <ChevronDown className="size-4" />
        </button>
      </div>
    </header>
  );
}
