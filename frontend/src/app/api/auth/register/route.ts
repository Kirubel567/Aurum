import { NextResponse } from "next/server";

import {
  buildDepositSession,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import {
  createDepositUser,
  getDepositUserByEmail,
} from "@/src/features/onboarding/lib/deposit-store";
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
    const user = await createDepositUser({
      id: userId,
      email: payload.email,
      password: payload.password,
      fullName: payload.fullName,
      username: payload.username,
      phoneNumber: payload.phoneNumber,
      country: payload.country,
      depositStatus: "none",
    });

    const session = buildDepositSession(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: "investor",
      },
      user.depositStatus
    );

    await setDepositSessionCookie(session);

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
