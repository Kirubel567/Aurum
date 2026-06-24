import {
  getDepositSessionCookie,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import {
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_BYTES,
  validateDepositAmount,
} from "@/src/features/onboarding/lib/deposit-limits";
import {
  sendAdminProofNotificationEmail,
  sendInvestorProofReceivedEmail,
} from "@/src/features/onboarding/lib/email";
import {
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import type {
  DepositSession,
  SubmitProofResult,
} from "@/src/features/onboarding/types/deposit.types";

function validateProofPayload(file: File): void {
  if (!ALLOWED_PROOF_MIME_TYPES.has(file.type)) {
    throw new Error("Only PDF, JPG, PNG, or WEBP files are accepted.");
  }
  if (file.size > MAX_PROOF_FILE_BYTES) {
    throw new Error("File size must be under 10 MB.");
  }
}

export async function processDepositProofSubmission(
  file: File,
  sessionOverride?: DepositSession,
  depositAmountRaw?: string
): Promise<SubmitProofResult> {
  const session = sessionOverride ?? (await getDepositSessionCookie());
  if (!session) {
    throw new Error("Unauthorized");
  }

  const amountError = validateDepositAmount(depositAmountRaw ?? "");
  if (amountError) {
    throw new Error(amountError);
  }

  const intendedDepositAmount = Number(depositAmountRaw);

  validateProofPayload(file);

  const user = await getDepositUserById(session.user.id);
  const buffer = Buffer.from(await file.arrayBuffer());
  const proofBase64 = buffer.toString("base64");

  // Email dispatch is the durable audit trail on ephemeral serverless runtimes.
  await Promise.all([
    sendInvestorProofReceivedEmail(session.user.email, session.user.name),
    sendAdminProofNotificationEmail({
      investorEmail: session.user.email,
      investorName: session.user.name,
      username: user?.username ?? session.user.email,
      phoneNumber: user?.phoneNumber ?? "Not on record",
      country: user?.country ?? "Not on record",
      intendedDepositAmount,
      proofFileName: file.name,
      proofBase64,
      proofMimeType: file.type,
      investorId: session.user.id,
    }),
  ]);

  if (user) {
    const updated = await updateDepositUser(user.id, {
      depositStatus: "pending",
      intendedDepositAmount,
      proofFileName: file.name,
      proofMimeType: file.type,
      proofBase64,
    });

    if (!updated) {
      console.warn(
        "[deposit-proof] Store update failed after email dispatch for user",
        session.user.id
      );
    }
  } else {
    console.warn(
      "[deposit-proof] User record missing in local store; emails dispatched and cookie updated",
      session.user.id
    );
  }

  const nextSession: DepositSession = {
    ...session,
    depositStatus: "pending",
  };
  await setDepositSessionCookie(nextSession);

  return { depositStatus: "pending" };
}
