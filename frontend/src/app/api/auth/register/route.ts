import { NextResponse } from "next/server";

import {
  buildDepositSession,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import { sendEmailVerificationEmail } from "@/src/features/onboarding/lib/email";
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
    const user = await createDepositUser({
      id: userId,
      email: payload.email,
      password: hashedPassword,
      fullName: payload.fullName,
      username: payload.username,
      phoneNumber: payload.phoneNumber,
      country: payload.country,
      depositStatus: "none",
      emailVerified: false,
    });

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

    try {
      await sendEmailVerificationEmail(user.email, user.fullName);
    } catch (emailError) {
      console.error("[register] Verification email dispatch failed:", emailError);
    }

    return NextResponse.json({
      session,
      userId: user.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
