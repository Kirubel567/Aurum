"use client";

import { useCallback, useEffect, useState } from "react";

import * as authApi from "@/src/services/api/auth.api";
import { useAuthStore } from "@/src/store/auth.store";
import type { LoginPayload } from "@/src/types/auth.types";

export function useAuth() {
  const { session, isLoading, setSession, setLoading, clearSession } =
    useAuthStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setLoading(true);
    authApi
      .getSession()
      .then((s) => {
        setSession(s);
        setHydrated(true);
      })
      .finally(() => setLoading(false));
  }, [setSession, setLoading]);

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
    await authApi.logout();
    clearSession();
  }, [clearSession]);

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
