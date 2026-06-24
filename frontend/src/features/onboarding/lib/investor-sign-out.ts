import { useDepositStore } from "@/src/features/onboarding/store/deposit.store";
import { useAuthStore } from "@/src/store/auth.store";

export async function signOutInvestor(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
  useAuthStore.getState().clearSession();
  useDepositStore.getState().reset();
}
