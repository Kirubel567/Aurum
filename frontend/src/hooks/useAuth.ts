"use client";

import { useCallback, useEffect, useState } from "react";

import {
  fetchDepositSession,
  loginViaApi,
} from "@/src/features/onboarding/services/deposit.service";
import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import { useAuthStore } from "@/src/store/auth.store";
import type { LoginPayload } from "@/src/types/auth.types";

export function useAuth() {
  const { session, isLoading, setSession, setLoading, clearSession } =
    useAuthStore();
  const setDepositStatus = useDepositStore((s) => s.setDepositStatus);
  const setEmailVerified = useDepositStore((s) => s.setEmailVerified);
  const setDepositHydrated = useDepositStore((s) => s.setHydrated);
  const resetDeposit = useDepositStore((s) => s.reset);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchDepositSession()
      .then((s) => {
        setSession(s);
        if (s?.depositStatus) {
          setDepositStatus(s.depositStatus);
          setEmailVerified(s.emailVerified ?? false);
        } else {
          setDepositStatus(null);
          setEmailVerified(false);
        }
        setDepositHydrated(true);
        setHydrated(true);
      })
      .finally(() => setLoading(false));
  }, [setSession, setLoading, setDepositStatus, setEmailVerified, setDepositHydrated]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true);
      try {
        const { session: newSession } = await loginViaApi(payload);
        setSession(newSession);
        setDepositStatus(newSession.depositStatus);
        setEmailVerified(newSession.emailVerified ?? false);
        return newSession;
      } finally {
        setLoading(false);
      }
    },
    [setSession, setLoading, setDepositStatus, setEmailVerified]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    clearSession();
    resetDeposit();
  }, [clearSession, resetDeposit]);

  return {
    user: session?.user ?? null,
    session,
    isLoading,
    isAuthenticated: !!session,
    hydrated,
    login,
    logout,
  };
}
