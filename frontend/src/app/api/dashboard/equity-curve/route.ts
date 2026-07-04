import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { buildEquityCurve, isCurvePeriod } from "@/src/lib/server/equity-curve";

// GET /api/dashboard/equity-curve?period=day|week|month|year
export async function GET(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const periodParam = request.nextUrl.searchParams.get("period") ?? "week";
    const period = isCurvePeriod(periodParam) ? periodParam : "week";

    const { points, changePercent } = await buildEquityCurve(session.user.id, period);
    return NextResponse.json({ period, points, changePercent });
  } catch (error) {
    console.error("[equity-curve] crashed:", error);
    return NextResponse.json({ error: "Failed to load equity curve." }, { status: 500 });
  }
}
