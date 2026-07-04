import { NextResponse } from "next/server";

import { buildDepositSession } from "@/src/features/onboarding/lib/deposit-cookies";
import { sendEmailVerificationEmail } from "@/src/features/onboarding/lib/email";
import {
  generateEmailVerificationToken,
  getEmailVerificationExpiry,
  resolveAppBaseUrl,
} from "@/src/features/onboarding/lib/email-verification-token";
import {
  getDepositUserByEmail,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import {
  createServerClient,
  createSupabaseSessionClient,
} from "@/src/lib/supabase/server";
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

    const verificationToken = generateEmailVerificationToken();

    // Privileged identity creation — this is what actually provisions
    // auth.users. handle_new_user() then auto-creates the matching
    // deposit_users + wallets rows (id/email/role/deposit_status only).
    const admin = createServerClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
    });

    if (createError || !created?.user) {
      // GoTrue rejects duplicates with the email_exists code — this also
      // catches auth.users rows orphaned by a deposit_users-only delete
      // (identity lives in auth.users now; deleting only the profile row
      // does NOT free the email).
      const isDuplicate =
        createError?.code === "email_exists" ||
        /already.*(registered|exists)/i.test(createError?.message ?? "");
      console.error("[register] createUser failed:", createError?.message);
      return NextResponse.json(
        {
          error: isDuplicate
            ? "An account with this email already exists."
            : "Registration failed. Please try again.",
        },
        { status: isDuplicate ? 409 : 500 }
      );
    }

    const userId = created.user.id;

    const user = await updateDepositUser(userId, {
      fullName: payload.fullName,
      username: payload.username,
      phoneNumber: payload.phoneNumber,
      country: payload.country,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpiresAt: getEmailVerificationExpiry(),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Registration failed. Please try again." },
        { status: 500 }
      );
    }

    // The account exists from this point on — a failed verification email
    // must never fail the registration (the user can resend it from the
    // verification panel). Treating it as fatal used to leave half-created
    // accounts that reported "registration failed" but could log in.
    let verificationEmailSent = true;
    try {
      const verificationUrl = `${resolveAppBaseUrl()}/api/onboarding/verify-email?token=${verificationToken}`;
      await sendEmailVerificationEmail(user.email, user.fullName, verificationUrl);
    } catch (emailError) {
      verificationEmailSent = false;
      console.error("[register] verification email failed:", emailError);
    }

    const supabase = await createSupabaseSessionClient();
    const { data: signedIn } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    const session = buildDepositSession(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: "investor",
      },
      user.depositStatus,
      user.emailVerified,
      signedIn.session?.access_token ?? ""
    );

    return NextResponse.json({
      session,
      userId: user.id,
      verificationEmailSent,
    });
  } catch (error) {
    console.error("[register] unexpected failure:", error);
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
