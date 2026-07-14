import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { buildEquityCurve, isCurvePeriod } from "@/src/lib/server/equity-curve";

// GET /api/dashboard/equity-curve?period=day|week|month|year
// Trading performance only — deposits/withdrawals never move this curve.
export async function GET(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const periodParam = request.nextUrl.searchParams.get("period") ?? "week";
    const period = isCurvePeriod(periodParam) ? periodParam : "week";

    const [{ points }, wallet] = await Promise.all([
      buildEquityCurve(session.user.id, period),
      createServerClient()
        .from("wallets")
        .select("locked_principal")
        .eq("user_id", session.user.id)
        .eq("currency", "USD")
        .maybeSingle(),
    ]);

    // Return on capital: this period's P/L as a % of trading capital under
    // management — NOT "% change from the first data point" (that formula
    // divides by ~$0 whenever the window opens with no P/L yet, which is
    // the common case, and was silently floors to 0% instead of showing a
    // real gain or loss). Can be negative — a loss is a negative %, exactly
    // as much as was lost relative to capital.
    const tradingCapital = Number(wallet.data?.locked_principal ?? 0);
    const periodPl = points.length > 0
      ? points[points.length - 1].equity - points[0].equity
      : 0;
    const changePercent = tradingCapital > 0
      ? Number(((periodPl / tradingCapital) * 100).toFixed(2))
      : 0;

    return NextResponse.json({ period, points, changePercent });
  } catch (error) {
    console.error("[equity-curve] crashed:", error);
    return NextResponse.json({ error: "Failed to load equity curve." }, { status: 500 });
  }
}
