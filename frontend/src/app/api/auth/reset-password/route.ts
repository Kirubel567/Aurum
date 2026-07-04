import { NextResponse } from "next/server";

import { buildDepositSession } from "@/src/features/onboarding/lib/deposit-cookies";
import {
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import { createSupabaseSessionClient } from "@/src/lib/supabase/server";

// POST /api/auth/reset-password — consumes the one-time recovery token from
// the reset email and sets the new password. On success the user is signed
// in (verifyOtp establishes a real session) and gets the same session shape
// login returns, so the client can route them straight to their dashboard.
export async function POST(request: Request) {
  try {
    const { tokenHash, password } = (await request.json().catch(() => ({}))) as {
      tokenHash?: string;
      password?: string;
    };

    if (!tokenHash || !password) {
      return NextResponse.json(
        { error: "Reset token and new password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseSessionClient();

    const { data: verified, error: verifyError } = await supabase.auth.verifyOtp({
      type: "recovery",
      token_hash: tokenHash,
    });

    if (verifyError || !verified?.user) {
      return NextResponse.json(
        {
          error:
            "This reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      return NextResponse.json(
        { error: "Could not set the new password. Please try again." },
        { status: 500 }
      );
    }

    // A reset supersedes any legacy pre-migration hash — clear it so the
    // lazy-upgrade path can never resurrect the old password.
    const profile = await getDepositUserById(verified.user.id);
    if (profile?.password) {
      await updateDepositUser(profile.id, { password: null });
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Account profile not found. Contact support." },
        { status: 500 }
      );
    }

    const isStaff = profile.role !== "investor";
    const session = buildDepositSession(
      {
        id: profile.id,
        email: profile.email,
        fullName: profile.fullName,
        role: profile.role,
      },
      isStaff ? "approved" : profile.depositStatus,
      isStaff ? true : (profile.emailVerified ?? false)
    );

    return NextResponse.json({ session });
  } catch (error) {
    console.error("[reset-password] unexpected failure:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
