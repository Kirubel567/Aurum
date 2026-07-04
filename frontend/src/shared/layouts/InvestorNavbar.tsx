"use client";

import { Menu, Sun, Moon } from "lucide-react";

import { useTheme } from "@/src/hooks/useTheme";
import { useSessionHydration } from "@/src/hooks/useSessionHydration";
import { NotificationBell } from "@/src/features/notifications/components/NotificationBell";
import { UserMenu } from "./UserMenu";

interface InvestorNavbarProps {
  onMenuClick?: () => void;
}

export function InvestorNavbar({ onMenuClick }: InvestorNavbarProps) {
  const session = useSessionHydration();
  const { isDark, toggle: toggleTheme } = useTheme();

  const displayName = session?.user.name ?? "Investor";

  return (
    // relative z-40 keeps the dropdown panels (bell, avatar menu) painting
    // above the page content, which otherwise stacks over them on scroll.
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] dark:border-white/[0.07] bg-white/85 dark:bg-[#0B1221]/90 backdrop-blur-xl px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {/* Hamburger — visible only on mobile */}
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="size-5" />
        </button>

        <div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Welcome back,</p>
          <h2 className="text-[13px] font-bold text-slate-800 dark:text-white">{displayName}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dark mode toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle dark mode"
          className="relative flex size-8 items-center justify-center rounded-lg text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <Sun
            className="size-[18px] absolute transition-all duration-300"
            style={{
              opacity: isDark ? 1 : 0,
              transform: isDark ? "rotate(0deg) scale(1)" : "rotate(-90deg) scale(0.5)",
            }}
          />
          <Moon
            className="size-[18px] absolute transition-all duration-300"
            style={{
              opacity: isDark ? 0 : 1,
              transform: isDark ? "rotate(90deg) scale(0.5)" : "rotate(0deg) scale(1)",
            }}
          />
        </button>

        <NotificationBell />

        <div className="ml-1 border-l border-[#E2E8F0] pl-2 dark:border-white/10 sm:pl-3">
          <UserMenu variant="investor" />
        </div>
      </div>
    </header>
  );
}
