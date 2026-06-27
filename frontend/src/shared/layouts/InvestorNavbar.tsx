"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Bell, ChevronDown, Menu } from "lucide-react";

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

  useEffect(() => {
    getSession().then(setSession);
    getProfile().then(setProfile);
  }, []);

  const displayName = profile?.name ?? session?.user.name ?? "Investor";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-4 sm:h-20 sm:px-8">
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
          <p className="text-xs font-medium text-slate-500">Welcome back,</p>
          <h2 className="text-sm font-bold text-slate-800 sm:text-lg">{displayName}</h2>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
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
