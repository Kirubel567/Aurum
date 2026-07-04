import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { fetchLivePrice } from "@/src/lib/trading/price-feed";

// GET /api/admin/console/market-price?assetPair=EUR/USD — staff only.
// Returns { available: true, price, source, asOf } or { available: false,
// reason } — never a hard error for "we don't have a feed for this pair",
// since manual entry always remains the fallback.
export async function GET(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assetPair = request.nextUrl.searchParams.get("assetPair");
    if (!assetPair) {
      return NextResponse.json({ error: "assetPair query param is required." }, { status: 400 });
    }

    const result = await fetchLivePrice(assetPair);
    if (!result) {
      return NextResponse.json({
        available: false,
        reason: "No live price feed available for this pair — enter it manually.",
      });
    }

    return NextResponse.json({ available: true, ...result });
  } catch (error) {
    console.error("[market-price] crashed:", error);
    return NextResponse.json({ available: false, reason: "Price lookup failed." });
  }
}
