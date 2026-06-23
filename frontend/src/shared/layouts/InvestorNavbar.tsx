"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";

import { getSession } from "@/src/services/api/auth.api";
import { getProfile } from "@/src/services/api/users.api";
import type { AuthSession } from "@/src/types/auth.types";
import type { UserProfile } from "@/src/types/user.types";

export function InvestorNavbar() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    getSession().then(setSession);
    getProfile().then(setProfile);
  }, []);

  const displayName = profile?.name ?? session?.user.name ?? "Investor";

  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-[#E2E8F0] bg-white px-8">
      <div>
        <p className="text-xs font-medium text-slate-500">Welcome back,</p>
        <h2 className="text-lg font-bold text-slate-800">{displayName}</h2>
      </div>

      <div className="flex items-center gap-6">
        <button
          type="button"
          className="relative p-2 text-slate-400 transition-colors hover:text-slate-600"
          aria-label="Notifications"
        >
          <Bell className="size-6" />
          <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full border-2 border-white bg-red-500 text-[10px] text-white">
            1
          </span>
        </button>

        <div className="flex cursor-pointer items-center gap-3 border-l border-[#E2E8F0] pl-6">
          <div className="relative size-10 overflow-hidden rounded-full border-2 border-white bg-slate-200 shadow-sm">
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
          <div>
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
