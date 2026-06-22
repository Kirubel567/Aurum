"use client";

import { useEffect, useState } from "react";
import { Bell, LogOut } from "lucide-react";

import { getSession } from "@/src/services/api/auth.api";
import { getSummary } from "@/src/services/api/wallet.api";
import type { AuthSession } from "@/src/types/auth.types";
import type { WalletSummary } from "@/src/types/wallet.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function InvestorNavbar() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [summary, setSummary] = useState<WalletSummary | null>(null);

  useEffect(() => {
    getSession().then(setSession);
    getSummary().then(setSummary);
  }, []);

  return (
    <header className="flex h-14 items-center justify-between border-b border-white/[0.08] px-6 glass-panel rounded-none">
      <div className="text-sm text-muted-foreground">
        Welcome back
        {session?.user.name && (
          <span className="ml-1 font-medium text-foreground">
            {session.user.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {summary && (
          <div className="hidden rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 sm:block">
            <p className="text-[10px] tracking-wider text-muted-foreground uppercase">
              Available
            </p>
            <p className="text-sm font-semibold text-[#D4AF37]">
              {formatCurrency(summary.availableBalance)}
            </p>
          </div>
        )}

        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <Bell className="size-4" />
        </Button>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              "bg-[#D4AF37]/20 text-xs font-semibold text-[#D4AF37]"
            )}
          >
            {session?.user.name?.charAt(0) ?? "?"}
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
