import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getDepositSessionCookie();

  return NextResponse.json(
    { session },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
