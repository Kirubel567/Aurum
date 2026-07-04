import { NextResponse } from "next/server";

import { buildDepositSession } from "@/src/features/onboarding/lib/deposit-cookies";
import {
  getDepositUserByEmail,
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import { verifyPassword } from "@/src/features/onboarding/lib/password-hash";
import {
  createServerClient,
  createSupabaseSessionClient,
} from "@/src/lib/supabase/server";
import type { LoginPayload } from "@/src/types/auth.types";

// Accounts migrated from the pre-Supabase-Auth era have their real password
// only as a legacy scrypt hash on deposit_users.password — the auth.users row
// created by the backfill holds a random throwaway password the user never
// saw. On the first login attempt, verify against the legacy hash and, on
// match, set that same password in Supabase Auth so every future login goes
// through GoTrue directly. The legacy hash is cleared afterwards, retiring
// this path per-account.
async function tryLegacyPasswordUpgrade(
  email: string,
  password: string
): Promise<boolean> {
  const legacy = await getDepositUserByEmail(email);
  if (!legacy?.password?.startsWith("scrypt:")) return false;

  const matches = await verifyPassword(password, legacy.password);
  if (!matches) return false;

  const admin = createServerClient();
  const { error: updateError } = await admin.auth.admin.updateUserById(
    legacy.id,
    { password }
  );
  if (updateError) {
    console.error("[login] legacy upgrade failed for", legacy.id, updateError.message);
    return false;
  }

  // Clear the hash only after GoTrue accepted the password — if this update
  // fails the account still works (GoTrue path now succeeds), the hash just
  // gets cleared on a later attempt.
  await updateDepositUser(legacy.id, { password: null });
  return true;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoginPayload;

    if (!payload.email || !payload.password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseSessionClient();
    let { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    });

    if (signInError || !data.user) {
      const upgraded = await tryLegacyPasswordUpgrade(
        payload.email,
        payload.password
      );
      if (upgraded) {
        ({ data, error: signInError } = await supabase.auth.signInWithPassword({
          email: payload.email,
          password: payload.password,
        }));
      }
    }

    if (signInError || !data.user) {
      return NextResponse.json(
        { error: "Invalid credentials. Please try again." },
        { status: 401 }
      );
    }

    const profile = await getDepositUserById(data.user.id);
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
      isStaff ? true : (profile.emailVerified ?? false),
      data.session?.access_token ?? ""
    );

    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
