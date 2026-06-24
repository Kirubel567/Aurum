import { NextResponse } from "next/server";

import {
  getDepositSessionCookie,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import { sendEmailConfirmedEmail } from "@/src/features/onboarding/lib/email";
import {
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";

export async function POST() {
  try {
    const session = await getDepositSessionCookie();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getDepositUserById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "User record not found." },
        { status: 404 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({ emailVerified: true });
    }

    const updated = await updateDepositUser(user.id, { emailVerified: true });
    if (!updated) {
      return NextResponse.json(
        { error: "Unable to verify email." },
        { status: 500 }
      );
    }

    try {
      await sendEmailConfirmedEmail(updated.email, updated.fullName);
    } catch (emailError) {
      console.error("[verify-email] Confirmation email failed:", emailError);
    }

    const nextSession = { ...session, emailVerified: true };
    await setDepositSessionCookie(nextSession);

    return NextResponse.json({ emailVerified: true });
  } catch {
    return NextResponse.json(
      { error: "Email verification failed." },
      { status: 500 }
    );
  }
}
