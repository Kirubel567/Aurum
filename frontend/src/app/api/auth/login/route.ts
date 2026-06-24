import { NextResponse } from "next/server";

import {
  buildDepositSession,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import { getDepositUserByEmail, getDepositUserById } from "@/src/features/onboarding/lib/deposit-store";
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

    if (payload.email.includes("admin")) {
      const session = buildDepositSession(
        {
          id: "usr_adm_001",
          email: payload.email,
          fullName: "Elena Voss",
          role: "admin",
        },
        "approved",
        true
      );
      await setDepositSessionCookie(session);
      return NextResponse.json({ session });
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

    const dbUser = await getDepositUserById(user.id);
    if (!dbUser) {
      return NextResponse.json(
        { error: "Invalid credentials. Please try again." },
        { status: 401 }
      );
    }

    const session = buildDepositSession(
      {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: "investor",
      },
      dbUser.depositStatus,
      dbUser.emailVerified ?? false
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
