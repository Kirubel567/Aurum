"use client";

import { useCallback } from "react";

import { loginViaApi } from "@/src/features/onboarding/services/deposit.service";
import { signOutInvestor } from "@/src/features/onboarding/lib/investor-sign-out";
import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import { useAuthStore } from "@/src/store/auth.store";
import type { LoginPayload } from "@/src/types/auth.types";

export function useAuth() {
  const { session, isLoading, setSession, setLoading } = useAuthStore();
  const setDepositStatus = useDepositStore((s) => s.setDepositStatus);
  const setEmailVerified = useDepositStore((s) => s.setEmailVerified);

  const login = useCallback(
    async (payload: LoginPayload) => {
      setLoading(true);
      try {
        useDepositStore.getState().reset();
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
    await signOutInvestor();
  }, []);

  return {
    user: session?.user ?? null,
    session,
    isLoading,
    isAuthenticated: !!session,
    hydrated: true,
    login,
    logout,
  };
}
