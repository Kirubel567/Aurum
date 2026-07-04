"use server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { processDepositProofSubmission } from "@/src/features/onboarding/lib/submit-proof";
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

  return { depositStatus: session.depositStatus };
}
