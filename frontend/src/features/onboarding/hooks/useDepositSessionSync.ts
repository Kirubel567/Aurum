"use client";

import { useEffect } from "react";

import { subscribeDepositStatusChanges } from "@/src/features/onboarding/lib/deposit-sync";
import { fetchDepositSession } from "@/src/features/onboarding/services/deposit.service";
import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";

interface UseDepositSessionSyncOptions {
  enabled: boolean;
  onSession: (session: DepositSession | null) => void;
  pollIntervalMs?: number;
}

export function useDepositSessionSync({
  enabled,
  onSession,
  pollIntervalMs = 15000,
}: UseDepositSessionSyncOptions): void {
  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const refresh = async () => {
      try {
        const session = await fetchDepositSession();
        if (!cancelled) onSession(session);
      } catch {
        // Preserve current UI state on transient network failures.
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };

    void refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribe = subscribeDepositStatusChanges(refresh);
    const interval = window.setInterval(refresh, pollIntervalMs);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribe();
      window.clearInterval(interval);
    };
  }, [enabled, onSession, pollIntervalMs]);
}
