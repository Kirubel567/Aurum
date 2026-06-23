"use client";

import { create } from "zustand";

import type { DepositStatus } from "@/src/features/onboarding/types/deposit.types";

interface DepositState {
  depositStatus: DepositStatus | null;
  hydrated: boolean;
  setDepositStatus: (status: DepositStatus | null) => void;
  setHydrated: (hydrated: boolean) => void;
  reset: () => void;
}

export const useDepositStore = create<DepositState>((set) => ({
  depositStatus: null,
  hydrated: false,
  setDepositStatus: (depositStatus) => set({ depositStatus }),
  setHydrated: (hydrated) => set({ hydrated }),
  reset: () => set({ depositStatus: null, hydrated: false }),
}));

export function isDepositLocked(status: DepositStatus | null): boolean {
  return status === "none" || status === "pending" || status === "rejected";
}
