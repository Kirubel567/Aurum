import { NextResponse } from "next/server";

import { getDepositUserByEmail } from "@/src/features/onboarding/lib/deposit-store";
import { sendPasswordResetEmail } from "@/src/features/onboarding/lib/email";
import { resolveAppBaseUrl } from "@/src/features/onboarding/lib/email-verification-token";
import { createServerClient } from "@/src/lib/supabase/server";

// POST /api/auth/forgot-password — issues a one-time recovery link via
// Supabase Auth and sends it through the app's own email pipeline (no
// Supabase SMTP dependency). Always answers 200 with the same body whether
// or not the account exists, so this endpoint can't be used to enumerate
// registered emails.
export async function POST(request: Request) {
  try {
    const { email } = (await request.json().catch(() => ({}))) as {
      email?: string;
    };

    const normalized = (email ?? "").trim().toLowerCase();
    if (!normalized) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const user = await getDepositUserByEmail(normalized);
    if (user) {
      const admin = createServerClient();
      const { data, error } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: normalized,
      });

      if (error || !data?.properties?.hashed_token) {
        // Log and fall through to the generic response — the caller learns
        // nothing, and the user can simply retry.
        console.error("[forgot-password] generateLink failed:", error?.message);
      } else {
        const resetUrl = `${resolveAppBaseUrl()}/reset-password?token_hash=${data.properties.hashed_token}`;
        try {
          await sendPasswordResetEmail(user.email, user.fullName, resetUrl);
        } catch (emailError) {
          console.error("[forgot-password] email dispatch failed:", emailError);
        }
      }
    }

    return NextResponse.json({
      message:
        "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error) {
    console.error("[forgot-password] unexpected failure:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
