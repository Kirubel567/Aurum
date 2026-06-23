import { NextResponse } from "next/server";

import { clearDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

export async function POST() {
  await clearDepositSessionCookie();
  return NextResponse.json({ success: true });
}
