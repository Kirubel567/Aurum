import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { computeNotionalUsd } from "@/src/lib/trading/lot-size";
import { fetchLivePrice } from "@/src/lib/trading/price-feed";

// GET /api/dashboard/risk-metrics — the dashboard Risk Metrics card's real
// numbers, replacing the mock it shipped with:
//
//   leverage        effective account leverage: the investor's share of all
//                   open notional exposure divided by their current equity
//   volatility      stdev of the last 24h of equity-snapshot returns, in %
//                   (labelled "Volatility Index" in the UI)
//   drawdownPercent how far current equity sits below the 30-day peak
//   drawdownZone    Safe Zone (<5%), Caution (<10%), Critical (beyond)
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const db = createServerClient();

    const [wallet, openExecs] = await Promise.all([
      db.from("wallets").select("balance").eq("user_id", userId).eq("currency", "USD").maybeSingle(),
      db
        .from("trade_executions")
        .select("strategy_pool_id, asset_pair, side, lot_size, entry_price, current_price, target_investor_id")
        .eq("status", "open")
        .or(`target_investor_id.eq.${userId},target_investor_id.is.null`),
    ]);

    const balance = Number(wallet.data?.balance ?? 0);

    // ── Effective leverage: investor's open notional / equity. Every
    // relevant position (broadcast, or targeted at them) counts in full —
    // no pool/allocation weighting. ─────────────────────────────────────────
    let totalNotionalShare = 0;
    for (const row of openExecs.data ?? []) {
      if (row.lot_size == null) continue;
      const price = await fetchLivePrice(row.asset_pair).then(
        (r) => r?.price ?? Number(row.current_price ?? row.entry_price)
      );
      totalNotionalShare += computeNotionalUsd(row.asset_pair, Number(row.lot_size), price);
    }
    const leverageRatio = balance > 0 ? totalNotionalShare / balance : 0;
    const leverage = leverageRatio > 0 ? `${leverageRatio.toFixed(1)}x` : "0.0x";

    // ── Volatility + drawdown from persisted equity snapshots ───────────────
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 86400_000).toISOString();
    const [{ data: daySnaps }, { data: monthSnaps }] = await Promise.all([
      db
        .from("equity_snapshots")
        .select("equity")
        .eq("user_id", userId)
        .gte("created_at", dayAgo)
        .order("created_at", { ascending: true })
        .limit(1000),
      db
        .from("equity_snapshots")
        .select("equity")
        .eq("user_id", userId)
        .gte("created_at", monthAgo)
        .order("created_at", { ascending: true })
        .limit(5000),
    ]);

    // Volatility: stdev of consecutive snapshot-to-snapshot returns (%).
    let volatility = 0;
    const dayEquities = (daySnaps ?? []).map((s) => Number(s.equity)).filter((e) => e > 0);
    if (dayEquities.length >= 3) {
      const returns: number[] = [];
      for (let i = 1; i < dayEquities.length; i++) {
        returns.push((dayEquities[i] - dayEquities[i - 1]) / dayEquities[i - 1]);
      }
      const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
      const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
      volatility = Number((Math.sqrt(variance) * 100).toFixed(2));
    }

    // Drawdown: current equity vs the 30-day peak.
    const monthEquities = (monthSnaps ?? []).map((s) => Number(s.equity));
    const currentEquity = monthEquities.length > 0 ? monthEquities[monthEquities.length - 1] : balance;
    const peak = monthEquities.length > 0 ? Math.max(...monthEquities, currentEquity) : balance;
    const drawdownPercent =
      peak > 0 ? Number((Math.max(0, ((peak - currentEquity) / peak) * 100)).toFixed(2)) : 0;
    const drawdownZone =
      drawdownPercent < 5 ? "Safe Zone" : drawdownPercent < 10 ? "Caution" : "Critical";

    return NextResponse.json({ leverage, volatility, drawdownPercent, drawdownZone });
  } catch (error) {
    console.error("[risk-metrics] crashed:", error);
    return NextResponse.json({ error: "Failed to load risk metrics." }, { status: 500 });
  }
}
