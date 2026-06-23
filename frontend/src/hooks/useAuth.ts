"use client";

import { useCallback, useEffect, useState } from "react";

import { fetchDepositSession } from "@/src/features/onboarding/services/deposit.service";
import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import * as authApi from "@/src/services/api/auth.api";
import { useAuthStore } from "@/src/store/auth.store";
import type { LoginPayload } from "@/src/types/auth.types";

export function useAuth() {
  const { session, isLoading, setSession, setLoading, clearSession } =
    useAuthStore();
  const setDepositStatus = useDepositStore((s) => s.setDepositStatus);
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
        } else {
          setDepositStatus(null);
        }
        setDepositHydrated(true);
        setHydrated(true);
      })
      .finally(() => setLoading(false));
  }, [setSession, setLoading, setDepositStatus, setDepositHydrated]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true);
      try {
        const newSession = await authApi.login(payload);
        setSession(newSession);
        return newSession;
      } finally {
        setLoading(false);
      }
    },
    [setSession, setLoading]
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    await authApi.logout();
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
