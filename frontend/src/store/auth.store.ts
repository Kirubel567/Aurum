import { create } from "zustand";

import type { DepositSession } from "@/src/features/onboarding/types/deposit.types";

interface AuthState {
  session: DepositSession | null;
  isLoading: boolean;
  setSession: (session: DepositSession | null) => void;
  setLoading: (loading: boolean) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: false,
  setSession: (session) => set({ session }),
  setLoading: (isLoading) => set({ isLoading }),
  clearSession: () => set({ session: null }),
}));
