"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, History, BarChart2, Search, Zap, Menu, Sun, Moon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/src/store/auth.store";
import { ROUTES } from "@/src/lib/constants/routes";
import { useTheme } from "@/src/hooks/useTheme";

// ── AdminNavbar ───────────────────────────────────────────────────────────────

interface AdminNavbarProps {
  onMenuClick?: () => void;
}

export function AdminNavbar({ onMenuClick }: AdminNavbarProps) {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.session?.user);
  const [query, setQuery] = useState("");
  const { isDark, toggle: toggleTheme } = useTheme();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "A";

  return (
    <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-[#e2e8f0] dark:border-white/[0.07] bg-white/85 dark:bg-[#0f172a]/90 px-4 sm:px-6 backdrop-blur-xl">

      {/* ── Hamburger (mobile only) ─────────────────────────────────────────── */}
      <button
        onClick={onMenuClick}
        className="mr-3 flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all hover:bg-[#f1f5f9] hover:text-[#1a1c1e] lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center">
        <div className="relative w-full max-w-xs hidden sm:block">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#94a3b8]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transactions..."
            className="w-full rounded-lg border border-[#e2e8f0] bg-[#f8fafc] py-[7px] pl-9 pr-4 text-[13px] text-[#1a1c1e] placeholder-[#94a3b8] outline-none transition-all focus:border-[#d4af37]/50 focus:bg-white focus:ring-1 focus:ring-[#d4af37]/25 focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
          />
        </div>
      </div>

      {/* ── Right cluster ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-5">

        {/* Icon action buttons */}
        <div className="flex items-center gap-0.5 border-r border-[#e2e8f0] pr-5">
          {/* Notifications */}
          <button
            className="relative flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
            aria-label="Notifications"
          >
            <Bell className="size-[17px]" />
            {/* Live badge */}
            <span className="absolute right-1.5 top-1.5 size-[6px] rounded-full bg-[#d4af37]" />
          </button>

          {/* Activity history */}
          <button
            className="flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
            aria-label="Activity history"
          >
            <History className="size-[17px]" />
          </button>

          {/* Platform analytics */}
          <button
            className="flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-150 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
            aria-label="Platform analytics"
          >
            <BarChart2 className="size-[17px]" />
          </button>

          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="relative flex size-8 items-center justify-center rounded-lg text-[#64748b] transition-all duration-200 hover:bg-[#f1f5f9] hover:text-[#1a1c1e] dark:hover:bg-white/10 dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/30"
          >
            <Sun
              className="size-[17px] absolute transition-all duration-300"
              style={{
                opacity: isDark ? 1 : 0,
                transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
              }}
            />
            <Moon
              className="size-[17px] absolute transition-all duration-300"
              style={{
                opacity: isDark ? 0 : 1,
                transform: isDark ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
              }}
            />
          </button>
        </div>

        {/* Execute Trade CTA */}
        <Link
          href={ROUTES.ADMIN_CONSOLE}
          className="hidden sm:flex items-center gap-1.5 rounded-lg bg-[#d4af37] px-3.5 py-[7px] text-[12.5px] font-bold text-[#1a0e00] shadow-[0_2px_10px_rgba(212,175,55,0.32)] transition-all duration-150 hover:bg-[#c9a830] hover:shadow-[0_4px_16px_rgba(212,175,55,0.4)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/40"
        >
          <Zap className="size-[13px] fill-current" />
          Execute Trade
        </Link>

        {/* User profile */}
        <div className="flex items-center gap-2.5">
          <div className="text-right hidden md:block">
            <p className="text-[13px] font-semibold leading-tight text-[#1a1c1e] dark:text-white">
              {user?.name ?? "Admin"}
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#d4af37]">
              Senior Admin
            </p>
          </div>

          {/* Avatar */}
          <div
            className="flex size-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#d4af37]/30 text-[12px] font-bold text-[#d4af37] transition-all duration-150 hover:border-[#d4af37]/60"
            style={{ background: "rgba(212,175,55,0.08)" }}
          >
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
