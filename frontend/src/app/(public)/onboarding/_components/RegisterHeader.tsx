"use client";

import Link from "next/link";
import { ChevronDown, Globe } from "lucide-react";

import { ROUTES } from "@/src/lib/constants/routes";
import { cn } from "@/lib/utils";
import { BrandLockup } from "../../_components/BrandLockup";

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
        "sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-white/10 bg-[#050B14]/95 px-4 backdrop-blur-sm sm:px-6 lg:px-10",
        className
      )}
    >
      <BrandLockup priority tone="gold" />

      <div className="flex items-center gap-4 sm:gap-6">
        <span className="hidden text-sm text-[#c5c6cc] lg:inline">
          {variant === "register"
            ? "Already have an account?"
            : "Don't have an account?"}
        </span>
        <Link
          href={variant === "register" ? ROUTES.LOGIN : ROUTES.ONBOARDING}
          className="rounded-lg border border-[#e9c349]/70 px-4 py-2 text-sm font-semibold text-[#f4d979] transition-all duration-200 hover:bg-[#e9c349]/10 active:scale-95"
        >
          {variant === "register" ? "Login" : "Register"}
        </Link>
        <button
          type="button"
          className="hidden items-center gap-1 text-sm font-medium text-[#c5c6cc] transition-colors hover:text-[#e9c349] sm:flex"
        >
          <Globe className="size-4" />
          <span>EN</span>
          <ChevronDown className="size-4" />
        </button>
      </div>
    </header>
  );
}
