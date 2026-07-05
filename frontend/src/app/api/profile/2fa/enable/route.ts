import { NextResponse } from "next/server";
import { generateSecret, generateURI } from "otplib";
import QRCode from "qrcode";
import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

const APP_NAME = "Aurum Sovereign Capital";

// POST /api/profile/2fa/enable
// Returns a new TOTP secret + QR code data URL. The secret is NOT yet saved.
// The client must call /api/profile/2fa/verify with the secret + a valid token
// to activate 2FA.
export async function POST() {
  const session = await getDepositSessionCookie();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if 2FA is already enabled
  const supabase = createServerClient();
  const { data: user } = await supabase
    .from("deposit_users")
    .select("two_fa_enabled, email")
    .eq("id", session.user.id)
    .single();

  if (user?.two_fa_enabled) {
    return NextResponse.json({ error: "2FA is already enabled" }, { status: 400 });
  }

  const secret = generateSecret();
  const email = user?.email ?? session.user.email ?? "user";
  const otpauthUri = generateURI({ issuer: APP_NAME, label: email, secret });
  const qrDataUrl = await QRCode.toDataURL(otpauthUri);

  return NextResponse.json({ secret, qrDataUrl, otpauthUri });
}
