import { NextResponse } from "next/server";

import { updateDepositUser } from "@/src/features/onboarding/lib/deposit-store";
import { createSupabaseSessionClient } from "@/src/lib/supabase/server";

// POST /api/auth/change-password — for a logged-in user: re-verifies the
// current password, then sets the new one. This is how admins rotate the
// generated temporary password they were provisioned with.
export async function POST(request: Request) {
  try {
    const { currentPassword, newPassword } = (await request
      .json()
      .catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new password are required." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters." },
        { status: 400 }
      );
    }

    if (newPassword === currentPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current one." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseSessionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Re-authenticate with the current password before allowing the change —
    // an unattended, already-open session must not be enough to take over
    // the account with a new password.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 401 }
      );
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (updateError) {
      return NextResponse.json(
        { error: "Could not update the password. Please try again." },
        { status: 500 }
      );
    }

    // A password change supersedes any legacy pre-migration hash.
    await updateDepositUser(user.id, { password: null });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[change-password] unexpected failure:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
