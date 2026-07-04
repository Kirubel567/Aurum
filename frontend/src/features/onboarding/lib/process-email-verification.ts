import { sendEmailConfirmedEmail } from "@/src/features/onboarding/lib/email";
import { isVerificationTokenExpired } from "@/src/features/onboarding/lib/email-verification-token";
import {
  getDepositUserByVerificationToken,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";

export type EmailVerificationResult =
  | { status: "verified"; userId: string }
  | { status: "already_verified"; userId: string }
  | { status: "invalid_token" }
  | { status: "expired_token" };

export async function processEmailVerificationToken(
  token: string
): Promise<EmailVerificationResult> {
  const user = await getDepositUserByVerificationToken(token);
  if (!user) {
    return { status: "invalid_token" };
  }

  if (user.emailVerified) {
    return { status: "already_verified", userId: user.id };
  }

  if (isVerificationTokenExpired(user.emailVerificationTokenExpiresAt)) {
    return { status: "expired_token" };
  }

  const updated = await updateDepositUser(user.id, {
    emailVerified: true,
    emailVerificationToken: undefined,
    emailVerificationTokenExpiresAt: undefined,
  });

  if (!updated) {
    return { status: "invalid_token" };
  }

  await sendEmailConfirmedEmail(updated.email, updated.fullName);

  return { status: "verified", userId: updated.id };
}
