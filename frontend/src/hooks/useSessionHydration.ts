"use client";

import { useEffect } from "react";

import { fetchDepositSession } from "@/src/features/onboarding/services/deposit.service";
import { useAuthStore } from "@/src/store/auth.store";

// On a hard refresh the zustand auth store starts empty even though the
// Supabase cookie session is alive — the investor shell recovers via
// DepositGate, but the nav bars (and the admin shell, which has no gate
// component) need the session for the greeting/role pill/avatar. This
// hydrates the store once from /api/auth/session if it's empty.
export function useSessionHydration() {
  const session = useAuthStore((s) => s.session);
  const setSession = useAuthStore((s) => s.setSession);

  useEffect(() => {
    if (session) return;
    let cancelled = false;

    fetchDepositSession().then((remote) => {
      if (!cancelled && remote) setSession(remote);
    });

    return () => {
      cancelled = true;
    };
  }, [session, setSession]);

  return session;
}
