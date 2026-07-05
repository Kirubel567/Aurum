import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// POST /api/profile/2fa/verify
// Body: { secret: string; token: string }
// Validates the TOTP token against the given secret, then stores it and
// sets two_fa_enabled = true.
export async function POST(req: NextRequest) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { secret, token } = await req.json() as { secret?: string; token?: string };
  if (!secret || !token) {
    return NextResponse.json({ error: "secret and token are required" }, { status: 400 });
  }

  const result = verifySync({ token, secret });
  if (!result.valid) {
    return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from("deposit_users")
    .update({ two_fa_enabled: true, two_fa_secret: secret })
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
