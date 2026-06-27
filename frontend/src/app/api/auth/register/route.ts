import { NextResponse } from "next/server";

import {
  buildDepositSession,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import {
  EmailConfigurationError,
  EmailDispatchError,
  sendEmailVerificationEmail,
} from "@/src/features/onboarding/lib/email";
import {
  generateEmailVerificationToken,
  getEmailVerificationExpiry,
  resolveAppBaseUrl,
} from "@/src/features/onboarding/lib/email-verification-token";
import {
  createDepositUser,
  getDepositUserByEmail,
} from "@/src/features/onboarding/lib/deposit-store";
import { hashPassword } from "@/src/features/onboarding/lib/password-hash";
import type { RegistrationApiPayload } from "@/src/features/onboarding/types/deposit.types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as RegistrationApiPayload;

    if (!payload.email || !payload.password || !payload.fullName) {
      return NextResponse.json(
        { error: "Missing required registration fields." },
        { status: 400 }
      );
    }

    const existing = await getDepositUserByEmail(payload.email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const userId = `usr_${Date.now()}`;
    const hashedPassword = await hashPassword(payload.password);
    const verificationToken = generateEmailVerificationToken();
    const user = await createDepositUser({
      id: userId,
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      username: payload.username,
      phoneNumber: payload.phoneNumber,
      country: payload.country,
      role: "investor",
      depositStatus: "none",
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiresAt: getEmailVerificationExpiry(),
    });

    const verificationUrl = `${resolveAppBaseUrl()}/api/onboarding/verify-email?token=${verificationToken}`;
    await sendEmailVerificationEmail(
      user.email,
      user.fullName,
      verificationUrl
    );

    const session = buildDepositSession(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: "investor",
      },
      user.depositStatus,
      user.emailVerified
    );

    await setDepositSessionCookie(session);

    return NextResponse.json({
      session,
      userId: user.id,
    });
  } catch (error) {
    if (
      error instanceof EmailConfigurationError ||
      error instanceof EmailDispatchError
    ) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
