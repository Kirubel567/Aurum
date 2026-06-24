"use client";

import { create } from "zustand";

import type { DepositStatus } from "@/src/features/onboarding/types/deposit.types";

interface DepositState {
  depositStatus: DepositStatus | null;
  emailVerified: boolean;
  hydrated: boolean;
  setDepositStatus: (status: DepositStatus | null) => void;
  setEmailVerified: (verified: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

export const useDepositStore = create<DepositState>((set) => ({
  depositStatus: null,
  emailVerified: false,
  hydrated: false,
  setDepositStatus: (depositStatus) => set({ depositStatus }),
  setEmailVerified: (emailVerified) => set({ emailVerified }),
  setHydrated: (hydrated) => set({ hydrated }),
  reset: () =>
    set({ depositStatus: null, emailVerified: false, hydrated: false }),
}));

export function isDepositLocked(status: DepositStatus | null): boolean {
  return status === "none" || status === "pending" || status === "rejected";
}
