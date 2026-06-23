import { NextResponse } from "next/server";

import {
  getDepositSessionCookie,
  setDepositSessionCookie,
} from "@/src/features/onboarding/lib/deposit-cookies";
import {
  sendInvestorApprovalEmail,
  sendInvestorRejectionEmail,
} from "@/src/features/onboarding/lib/email";
import {
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import type { AdminSimulationPayload } from "@/src/features/onboarding/types/deposit.types";

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json(
      { error: "Admin simulation is only available in development." },
      { status: 403 }
    );
  }

  try {
    const payload = (await request.json()) as AdminSimulationPayload;
    const session = await getDepositSessionCookie();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = payload.userId ?? session.user.id;
    const user = await getDepositUserById(userId);
    const depositStatus = payload.action === "approve" ? "approved" : "rejected";

    if (user) {
      const updated = await updateDepositUser(user.id, { depositStatus });

      if (!updated) {
        return NextResponse.json(
          { error: "Unable to update deposit status." },
          { status: 500 }
        );
      }

      if (payload.action === "approve") {
        await sendInvestorApprovalEmail(updated.email, updated.fullName);
      } else {
        await sendInvestorRejectionEmail(updated.email, updated.fullName);
      }
    } else {
      console.warn(
        "[admin-simulation] User record missing; updating session cookie only",
        userId
      );

      if (payload.action === "approve") {
        await sendInvestorApprovalEmail(session.user.email, session.user.name);
      } else {
        await sendInvestorRejectionEmail(session.user.email, session.user.name);
      }
    }

    if (session.user.id === userId) {
      await setDepositSessionCookie({
        ...session,
        depositStatus,
      });
    }

    return NextResponse.json({ depositStatus });
  } catch {
    return NextResponse.json(
      { error: "Simulation failed." },
      { status: 500 }
    );
  }
}
