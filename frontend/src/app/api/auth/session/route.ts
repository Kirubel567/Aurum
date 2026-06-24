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

  if (user) {
    const needsRefresh =
      user.depositStatus !== session.depositStatus ||
      (user.emailVerified ?? false) !== (session.emailVerified ?? false);

    if (needsRefresh) {
      const refreshed = {
        ...session,
        depositStatus: user.depositStatus,
        emailVerified: user.emailVerified ?? false,
      };
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
  }

  return NextResponse.json(
    {
      session: {
        ...session,
        emailVerified:
          session.emailVerified ??
          user?.emailVerified ??
          false,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
