import { NextRequest, NextResponse } from "next/server";
import { verifySync } from "otplib";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// POST /api/profile/2fa/disable
// Body: { token: string }
// Requires a valid TOTP token to prevent unauthorized disable.
export async function POST(req: NextRequest) {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { token } = await req.json() as { token?: string };
  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("deposit_users")
    .select("two_fa_enabled, two_fa_secret")
    .eq("id", session.user.id)
    .single();

  if (!user?.two_fa_enabled) {
    return NextResponse.json({ error: "2FA is not currently enabled" }, { status: 400 });
  }
  if (!user.two_fa_secret) {
    return NextResponse.json({ error: "No 2FA secret found" }, { status: 400 });
  }

  const result = verifySync({ token, secret: user.two_fa_secret });
  if (!result.valid) {
    return NextResponse.json({ error: "Invalid verification code. Please try again." }, { status: 400 });
  }

  const { error } = await supabase
    .from("deposit_users")
    .update({ two_fa_enabled: false, two_fa_secret: null })
    .eq("id", session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
