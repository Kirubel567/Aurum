"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu, Sun, Moon } from "lucide-react";
import { useTheme } from "@/src/hooks/useTheme";

import { getSession } from "@/src/services/api/auth.api";
import { getProfile } from "@/src/services/api/users.api";
import type { AuthSession } from "@/src/types/auth.types";
import type { UserProfile } from "@/src/types/user.types";

interface InvestorNavbarProps {
  onMenuClick?: () => void;
}

export function InvestorNavbar({ onMenuClick }: InvestorNavbarProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { isDark, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    getSession().then(setSession);
    getProfile().then(setProfile);
  }, []);

  const displayName = profile?.name ?? session?.user.name ?? "Investor";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] dark:border-white/[0.07] bg-white/85 dark:bg-[#0B1221]/90 backdrop-blur-xl px-4 sm:px-6">
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

      <div className="flex items-center gap-3 sm:gap-6">

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

        <button
          type="button"
          className="relative p-2 text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Notifications"
        >
          <Bell className="size-5 sm:size-6" />
          <span className="absolute right-1 top-1 flex size-3.5 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[9px] text-white sm:size-4 sm:text-[10px]">
            1
          </span>
        </button>

        <div className="flex cursor-pointer items-center gap-2 border-l border-[#E2E8F0] pl-3 sm:gap-3 sm:pl-6">
          <div className="relative size-8 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm sm:size-10">
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={displayName}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-sm font-bold text-slate-500">
                {displayName.charAt(0)}
              </div>
            )}
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1 text-sm font-bold text-slate-800">
              {displayName}
              <ChevronDown className="size-4 text-slate-400" />
            </div>
            {profile?.investorId && (
              <div className="text-[10px] text-slate-500">
                Investor ID: {profile.investorId}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
