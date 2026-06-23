import { NextResponse } from "next/server";

import {
  getDepositSessionCookie,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import { getDepositUserById } from "@/src/features/onboarding/lib/deposit-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session) {
    return NextResponse.json(
      { session: null },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  const user = await getDepositUserById(session.user.id);

  if (user && user.depositStatus !== session.depositStatus) {
    const refreshed = { ...session, depositStatus: user.depositStatus };
    await setDepositSessionCookie(refreshed);
    return NextResponse.json(
      { session: refreshed },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

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
