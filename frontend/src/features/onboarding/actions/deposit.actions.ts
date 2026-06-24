"use server";

import {
  getDepositSessionCookie,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import { processDepositProofSubmission } from "@/src/features/onboarding/lib/submit-proof";
import { getDepositUserById } from "@/src/features/onboarding/lib/deposit-store";
import type { SubmitProofResult } from "@/src/features/onboarding/types/deposit.types";

export async function submitDepositProof(
  formData: FormData
): Promise<SubmitProofResult> {
  const file = formData.get("proof");
  if (!(file instanceof File)) {
    throw new Error("A valid proof document is required.");
  }

  return processDepositProofSubmission(
    file,
    undefined,
    formData.get("depositAmount")?.toString()
  );
}

export async function refreshDepositSessionStatus(): Promise<SubmitProofResult | null> {
  const session = await getDepositSessionCookie();
  if (!session) return null;

  const user = await getDepositUserById(session.user.id);
  if (!user) {
    return { depositStatus: session.depositStatus };
  }

  const needsRefresh =
    user.depositStatus !== session.depositStatus ||
    (user.emailVerified ?? false) !== (session.emailVerified ?? false);

  if (needsRefresh) {
    const nextSession = {
      ...session,
      depositStatus: user.depositStatus,
      emailVerified: user.emailVerified ?? false,
    };
    await setDepositSessionCookie(nextSession);
    return { depositStatus: user.depositStatus };
  }

  return { depositStatus: session.depositStatus };
}
