import { NextResponse } from "next/server";

import {
  buildDepositSession,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import { getDepositUserByEmail } from "@/src/features/onboarding/lib/deposit-store";
import { verifyPassword } from "@/src/features/onboarding/lib/password-hash";
import type { LoginPayload } from "@/src/types/auth.types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginPayload;

    if (!payload.email || !payload.password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await getDepositUserByEmail(payload.email);
    if (!user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please try again." },
        { status: 401 }
      );
    }

    const passwordValid = await verifyPassword(payload.password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid credentials. Please try again." },
        { status: 401 }
      );
    }

    const session = buildDepositSession(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role ?? "investor",
      },
      user.role === "admin" ? "approved" : user.depositStatus,
      user.role === "admin" ? true : (user.emailVerified ?? false)
    );

    await setDepositSessionCookie(session);

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
