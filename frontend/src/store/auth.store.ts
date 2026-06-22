import { create } from "zustand";

import type { AuthSession } from "@/src/types/auth.types";

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
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
