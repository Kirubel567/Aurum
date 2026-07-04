"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, LogOut, Settings } from "lucide-react";

import { cn } from "@/lib/utils";
import { ROUTES } from "@/src/lib/constants/routes";
import { NavPopover } from "@/src/shared/components/NavPopover";
import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import { useAuthStore } from "@/src/store/auth.store";

interface UserMenuProps {
  variant: "investor" | "admin";
}

const ROLE_LABEL: Record<string, string> = {
  investor: "Investor",
  admin: "Account Manager",
  super_admin: "Platform Controller",
};

export function UserMenu({ variant }: UserMenuProps) {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const clearSession = useAuthStore((s) => s.clearSession);
  const resetDeposit = useDepositStore((s) => s.reset);
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const name = session?.user.name ?? (variant === "admin" ? "Admin" : "Investor");
  const email = session?.user.email ?? "";
  const role = session?.user.role ?? (variant === "admin" ? "admin" : "investor");

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      clearSession();
      resetDeposit();
      router.push(ROUTES.LOGIN);
    }
  }

  const settingsHref = variant === "admin" ? ROUTES.ADMIN_SETTINGS : ROUTES.PROFILE;
  const settingsLabel = variant === "admin" ? "System Settings" : "Profile Settings";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="group flex items-center gap-2.5 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30 dark:hover:bg-white/[0.06]"
      >
        {/* Avatar */}
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#d4af37]/30 text-[12px] font-bold text-[#8a6d3b] transition-all duration-150 group-hover:border-[#d4af37]/60 dark:text-[#d4af37]"
          style={{ background: "rgba(212,175,55,0.08)" }}
        >
          {initials}
        </span>

        <span className="hidden text-right md:block">
          <span className="block text-[13px] font-semibold leading-tight text-slate-800 dark:text-white">
            {name}
          </span>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#8a6d3b] dark:text-[#d4af37]">
            {ROLE_LABEL[role] ?? role}
          </span>
        </span>

        <ChevronDown
          className={cn(
            "hidden size-4 text-slate-400 transition-transform duration-200 md:block",
            open && "rotate-180"
          )}
        />
      </button>

      <NavPopover open={open} onClose={() => setOpen(false)} className="w-64">
        {/* Identity header */}
        <div className="border-b border-slate-100 px-4 py-3 dark:border-white/[0.07]">
          <p className="truncate text-[13px] font-bold text-slate-800 dark:text-white">
            {name}
          </p>
          {email && (
            <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
              {email}
            </p>
          )}
          <span className="mt-2 inline-flex items-center rounded-full border border-[#d4af37]/30 bg-[#d4af37]/10 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#8a6d3b] dark:text-[#d4af37]">
            {ROLE_LABEL[role] ?? role}
          </span>
        </div>

        {/* Actions */}
        <div className="p-1.5">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              router.push(settingsHref);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
            role="menuitem"
          >
            <Settings className="size-4 text-slate-400" />
            {settingsLabel}
          </button>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[12.5px] font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-500/10"
            role="menuitem"
          >
            {loggingOut ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {loggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </NavPopover>
    </div>
  );
}
