import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { computeRiskReward, formatRiskReward } from "@/src/lib/trading/risk-reward";

// GET /api/dashboard/trading — the Phase-2-backed data for the dashboard
// cards that were mock until now: allocation donut, investment distribution,
// top gainer/loser, best trades, open-positions value.

const DONUT_COLORS: Record<string, string> = {
  gold: "#f59e0b",
  slate: "#3b82f6",
  dark: "#10b981",
};

export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const db = createServerClient();

    const userId = session.user.id;

    const [poolsRes, relevantTradesRes, closedRes, openRes] = await Promise.all([
      db
        .from("strategy_pools")
        .select("id, name, tag_color, sort_order")
        .eq("active", true)
        .order("sort_order"),
      // Every trade that ever applied to this investor: broadcasts (target
      // NULL) plus anything their account manager targeted specifically at
      // them. Used purely to classify what % of trades fell in each category
      // — no money/allocation meaning anymore.
      db
        .from("trade_executions")
        .select("strategy_pool_id")
        .or(`target_investor_id.eq.${userId},target_investor_id.is.null`),
      // Closed trades this investor is allowed to see: broadcasts (target
      // NULL, applied to everyone) plus trades their account manager targeted
      // specifically at them. A trade targeted at ANOTHER investor is private
      // to that investor and must never surface in this one's top gainer/
      // loser or best-trades cards.
      db
        .from("trade_executions")
        .select("id, asset_pair, realized_pl_usd, entry_price, take_profit_price, stop_loss_price, opened_at, closed_at, strategy_pool_id")
        .eq("status", "closed")
        .not("realized_pl_usd", "is", null)
        .or(`target_investor_id.eq.${userId},target_investor_id.is.null`)
        .order("realized_pl_usd", { ascending: false }),
      // Open positions count — same visibility rule: only broadcasts and this
      // investor's own targeted trades.
      db
        .from("trade_executions")
        .select("id")
        .eq("status", "open")
        .or(`target_investor_id.eq.${userId},target_investor_id.is.null`),
    ]);

    const pools = poolsRes.data ?? [];
    const relevantTrades = relevantTradesRes.data ?? [];
    const totalRelevantTrades = relevantTrades.length;
    const countByPool = new Map<string, number>();
    for (const t of relevantTrades) {
      countByPool.set(t.strategy_pool_id, (countByPool.get(t.strategy_pool_id) ?? 0) + 1);
    }
    const pctByPool = (poolId: string) =>
      totalRelevantTrades > 0
        ? Number(((( countByPool.get(poolId) ?? 0) / totalRelevantTrades) * 100).toFixed(1))
        : 0;

    // "allocation"/"distribution" now mean: % of trades taken so far that
    // fall into each category (Forex Majors / Commodities / Global Indices),
    // not capital allocation. All zero until the first trade exists.
    const allocation = pools.map((pool, i) => ({
      name: pool.name,
      percent: pctByPool(pool.id),
      color: DONUT_COLORS[pool.tag_color] ?? Object.values(DONUT_COLORS)[i % 3],
    }));

    const distribution = pools.map((pool, i) => ({
      strategy: `${pool.name} ${pctByPool(pool.id)}%`,
      pool: `Category ${i + 1}`,
      distribution: pctByPool(pool.id),
    }));

    const closed = closedRes.data ?? [];

    // Aggregate net realized P/L per asset pair — the card shows top
    // gainer/loser ASSETS, so each pair appears once with its total.
    const plByAsset = new Map<string, number>();
    for (const t of closed) {
      plByAsset.set(t.asset_pair, (plByAsset.get(t.asset_pair) ?? 0) + Number(t.realized_pl_usd ?? 0));
    }
    const fmtUsd = (pl: number) =>
      `${pl >= 0 ? "+" : ""}${pl.toLocaleString("en-US", { style: "currency", currency: "USD" })}`;
    const byNetPl = [...plByAsset.entries()].sort((a, b) => b[1] - a[1]);
    const gainerLoser = {
      profitable: byNetPl
        .filter(([, pl]) => pl > 0)
        .slice(0, 3)
        .map(([name, pl]) => ({ name, value: fmtUsd(pl) })),
      unprofitable: byNetPl
        .filter(([, pl]) => pl < 0)
        .slice(-3)
        .reverse()
        .map(([name, pl]) => ({ name, value: fmtUsd(pl) })),
    };

    const bestTrades = closed.slice(0, 5).map((t) => ({
      id: t.id,
      asset: t.asset_pair,
      entryExit: `${new Date(t.opened_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${t.closed_at ? new Date(t.closed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}`,
      profit: Number(t.realized_pl_usd),
      riskReward: formatRiskReward(
        computeRiskReward(
          Number(t.entry_price),
          t.take_profit_price != null ? Number(t.take_profit_price) : null,
          t.stop_loss_price != null ? Number(t.stop_loss_price) : null
        )
      ),
    }));

    return NextResponse.json({
      allocation,
      distribution,
      gainerLoser,
      bestTrades,
      openPositionsCount: (openRes.data ?? []).length,
    });
  } catch (error) {
    console.error("[dashboard-trading] crashed:", error);
    return NextResponse.json({ error: "Failed to load trading data." }, { status: 500 });
  }
}
