"use server";

import {
  getDepositSessionCookie,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import {
  sendInvestorApprovalEmail,
  sendInvestorRejectionEmail,
} from "@/src/features/onboarding/lib/email";
import { processDepositProofSubmission } from "@/src/features/onboarding/lib/submit-proof";
import {
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import type {
  AdminSimulationAction,
  DepositStatus,
  SubmitProofResult,
} from "@/src/features/onboarding/types/deposit.types";

export async function submitDepositProof(
  formData: FormData
): Promise<SubmitProofResult> {
  const file = formData.get("proof");
  if (!(file instanceof File)) {
    throw new Error("A valid proof document is required.");
  }

  return processDepositProofSubmission(file);
}

export async function simulateAdminDepositAction(
  action: AdminSimulationAction
): Promise<SubmitProofResult> {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Admin simulation is only available in development.");
  }

  const session = await getDepositSessionCookie();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const user = await getDepositUserById(session.user.id);
  const depositStatus: DepositStatus =
    action === "approve" ? "approved" : "rejected";

  if (user) {
    const updated = await updateDepositUser(user.id, { depositStatus });
    if (!updated) {
      throw new Error("Unable to update deposit status.");
    }

    if (action === "approve") {
      await sendInvestorApprovalEmail(updated.email, updated.fullName);
    } else {
      await sendInvestorRejectionEmail(updated.email, updated.fullName);
    }
  } else {
    console.warn(
      "[deposit-simulation] User record missing; updating session cookie only",
      session.user.id
    );

    if (action === "approve") {
      await sendInvestorApprovalEmail(session.user.email, session.user.name);
    } else {
      await sendInvestorRejectionEmail(session.user.email, session.user.name);
    }
  }

  const nextSession = {
    ...session,
    depositStatus,
  };
  await setDepositSessionCookie(nextSession);

  return { depositStatus };
}

export async function refreshDepositSessionStatus(): Promise<SubmitProofResult | null> {
  const session = await getDepositSessionCookie();
  if (!session) return null;

  const user = await getDepositUserById(session.user.id);
  if (!user) {
    return { depositStatus: session.depositStatus };
  }

  if (user.depositStatus !== session.depositStatus) {
    const nextSession = {
      ...session,
      depositStatus: user.depositStatus,
    };
    await setDepositSessionCookie(nextSession);
    return { depositStatus: user.depositStatus };
  }

  return { depositStatus: session.depositStatus };
}
