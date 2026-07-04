import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { getDepositUserById, updateDepositUser } from "@/src/features/onboarding/lib/deposit-store";
import { sendEmailVerificationEmail } from "@/src/features/onboarding/lib/email";
import {
  generateEmailVerificationToken,
  getEmailVerificationExpiry,
  resolveAppBaseUrl,
} from "@/src/features/onboarding/lib/email-verification-token";

// POST /api/onboarding/resend-verification — re-issues the email verification
// link for the logged-in, not-yet-verified user. Rotates the token so any
// previously issued link stops working.
export async function POST() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getDepositUserById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ alreadyVerified: true });
    }

    const verificationToken = generateEmailVerificationToken();
    const updated = await updateDepositUser(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiresAt: getEmailVerificationExpiry(),
    });
    if (!updated) {
      return NextResponse.json(
        { error: "Could not issue a new verification link. Please try again." },
        { status: 500 }
      );
    }

    const verificationUrl = `${resolveAppBaseUrl()}/api/onboarding/verify-email?token=${verificationToken}`;
    try {
      await sendEmailVerificationEmail(user.email, user.fullName, verificationUrl);
    } catch (emailError) {
      console.error("[resend-verification] dispatch failed:", emailError);
      return NextResponse.json(
        { error: "We couldn't send the email right now. Please try again in a moment." },
        { status: 503 }
      );
    }

    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("[resend-verification] unexpected failure:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
