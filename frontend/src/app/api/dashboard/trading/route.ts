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

    const [allocationsRes, poolsRes, closedRes, openRes] = await Promise.all([
      db
        .from("investor_pool_allocations")
        .select("strategy_pool_id, allocation_pct")
        .eq("user_id", session.user.id),
      db
        .from("strategy_pools")
        .select("id, name, tag_color, sort_order")
        .eq("active", true)
        .order("sort_order"),
      db
        .from("trade_executions")
        .select("asset_pair, realized_pl_usd, entry_price, take_profit_price, stop_loss_price, opened_at, closed_at, strategy_pool_id")
        .eq("status", "closed")
        .not("realized_pl_usd", "is", null)
        .order("realized_pl_usd", { ascending: false }),
      db
        .from("trade_executions")
        .select("id")
        .eq("status", "open"),
    ]);

    const pools = poolsRes.data ?? [];
    const allocationByPool = new Map(
      (allocationsRes.data ?? []).map((a) => [a.strategy_pool_id, Number(a.allocation_pct)])
    );

    const allocation = pools.map((pool, i) => ({
      name: pool.name,
      percent: allocationByPool.get(pool.id) ?? 0,
      color: DONUT_COLORS[pool.tag_color] ?? Object.values(DONUT_COLORS)[i % 3],
    }));

    const distribution = pools.map((pool, i) => ({
      strategy: `${pool.name} ${allocationByPool.get(pool.id) ?? 0}%`,
      pool: `Pool ${i + 1}`,
      distribution: allocationByPool.get(pool.id) ?? 0,
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
