import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { buildEquityCurve } from "@/src/lib/server/equity-curve";
import { computePositionPl } from "@/src/lib/trading/lot-size";
import { fetchLivePrice } from "@/src/lib/trading/price-feed";

// GET /api/orders/live — the Live Performance page's full payload in one
// request (the page polls every 5s; one consolidated endpoint instead of
// the blueprint's three keeps the poll to a single round trip — deviation
// documented in the blueprint's Phase 2 status note).
//
// Shaped exactly like the existing LivePerformanceData type so the page
// components render unchanged.

const POOL_BAR_COLORS: Record<string, string> = {
  gold: "#e9c349",
  slate: "#94a3b8",
  dark: "#0f172a",
};

function formatUsd(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatPrice(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

// Percentage move of an open execution, sign-adjusted for the trade side.
function movePercent(row: {
  side: string;
  entry_price: number;
  current_price: number | null;
}): number | null {
  const current = row.current_price;
  if (current == null || Number(row.entry_price) === 0) return null;
  const raw = ((Number(current) - Number(row.entry_price)) / Number(row.entry_price)) * 100;
  return row.side === "SHORT" ? -raw : raw;
}

export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;
    const db = createServerClient();

    // Fetch wallet first (fast — single row) so we can pass the balance to
    // buildEquityCurve as a fallback for users with no ledger entries yet.
    const wallet = await db.from("wallets").select("balance").eq("user_id", userId).eq("currency", "USD").maybeSingle();
    const walletBalance = wallet.data?.balance != null ? Number(wallet.data.balance) : undefined;

    const [allocations, pools, curve] = await Promise.all([
      db
        .from("investor_pool_allocations")
        .select("strategy_pool_id, allocation_pct")
        .eq("user_id", userId),
      db
        .from("strategy_pools")
        .select("id, name, tag_color, tag, target_allocation_pct, sort_order")
        .eq("active", true)
        .order("sort_order"),
      buildEquityCurve(userId, "day", walletBalance),
    ]);

    const allocationByPool = new Map(
      (allocations.data ?? []).map((a) => [a.strategy_pool_id, Number(a.allocation_pct)])
    );
    // Investors see executions for pools they're allocated to; staff (or an
    // investor with no allocations yet) see all active pools' executions so
    // the page is never misleadingly empty.
    const poolIds =
      allocationByPool.size > 0
        ? [...allocationByPool.keys()]
        : (pools.data ?? []).map((p) => p.id);

    // "Active Orders & Executions" is a store for currently running trades
    // only — closed trades live in the console's Settled feed and the
    // dashboard's Best Trades table, not here. Includes pool-wide broadcasts
    // for pools this investor is allocated to, PLUS any trade their account
    // manager targeted specifically at them (which may belong to a pool
    // they aren't otherwise allocated to).
    const [openExecutionsRes, closedStats] = await Promise.all([
      db
        .from("trade_executions")
        .select("id, strategy_pool_id, asset_pair, side, leverage, lot_size, entry_price, current_price, opened_at, target_investor_id")
        .eq("status", "open")
        .or(
          `target_investor_id.eq.${userId},and(target_investor_id.is.null,strategy_pool_id.in.(${
            (poolIds.length > 0 ? poolIds : ["00000000-0000-0000-0000-000000000000"]).join(",")
          }))`
        )
        .order("opened_at", { ascending: false })
        .limit(30),
      db
        .from("trade_executions")
        .select("realized_pl_usd, status")
        .eq("status", "closed")
        .not("realized_pl_usd", "is", null),
    ]);

    // Fetch live prices server-side for all unique open pairs (cached 10s).
    // This means the investor sees real market prices on every 5s poll even
    // when no admin is actively refreshing the console.
    const uniquePairs = [...new Set((openExecutionsRes.data ?? []).map((r) => r.asset_pair))];
    const livePriceMap = new Map<string, number>();
    await Promise.all(
      uniquePairs.map(async (pair) => {
        const result = await fetchLivePrice(pair);
        if (result) livePriceMap.set(pair, result.price);
      })
    );

    const executions = (openExecutionsRes.data ?? []).map((row) => {
      const livePrice = livePriceMap.get(row.asset_pair);
      const effectiveCurrentPrice = livePrice ?? (row.current_price != null ? Number(row.current_price) : null);
      const enrichedRow = { ...row, current_price: effectiveCurrentPrice };
      const pct = movePercent(enrichedRow);
      return {
        id: row.id,
        time: new Date(row.opened_at).toLocaleTimeString("en-US", { hour12: false }),
        assetPair: row.asset_pair,
        type: row.side as "LONG" | "SHORT",
        leverage: row.leverage ?? "—",
        entry: formatPrice(Number(row.entry_price)),
        current: effectiveCurrentPrice != null ? formatPrice(effectiveCurrentPrice) : "—",
        pl: pct == null ? "—" : `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
        plPositive: (pct ?? 0) >= 0,
      };
    });

    const strategyPools = (pools.data ?? []).map((pool, i) => ({
      id: pool.id,
      name: pool.name,
      allocation: allocationByPool.get(pool.id) ?? Number(pool.target_allocation_pct),
      pool: `Liquidity Pool ${i + 1}`,
      tag: pool.tag ?? "",
      tagColor: (pool.tag_color ?? "gold") as "gold" | "slate" | "dark",
      barColor: POOL_BAR_COLORS[pool.tag_color] ?? POOL_BAR_COLORS.gold,
    }));

    // Platform-wide aggregates for the bottom metric cards.
    const closed = closedStats.data ?? [];
    const wins = closed.filter((t) => Number(t.realized_pl_usd) > 0).length;
    const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;
    const realizedTotal = closed.reduce((s, t) => s + Number(t.realized_pl_usd), 0);
    const { data: allWallets } = await db.from("wallets").select("balance");
    const totalFundEquity = (allWallets ?? []).reduce((s, w) => s + Number(w.balance), 0);

    const metrics = [
      { label: "Win Rate", value: closed.length > 0 ? `${winRate.toFixed(1)}%` : "—", icon: "trending" as const, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
      { label: "Open Positions", value: String(executions.length), icon: "bolt" as const, iconBg: "bg-yellow-50", iconColor: "text-[#947600]" },
      { label: "Total Fund Eq.", value: formatUsd(totalFundEquity), icon: "bank" as const, iconBg: "bg-blue-50", iconColor: "text-blue-600" },
      { label: "Realized P/L", value: `${realizedTotal >= 0 ? "+" : ""}${formatUsd(realizedTotal)}`, icon: "warning" as const, iconBg: realizedTotal >= 0 ? "bg-emerald-50" : "bg-red-50", iconColor: realizedTotal >= 0 ? "text-emerald-600" : "text-red-600" },
    ];

    const currentBalance = walletBalance ?? 0;

    // Real floating P/L: for each open position this investor is exposed
    // to, their share is 100% if it's targeted directly at them, or their
    // pool allocation_pct if it's a pool-wide broadcast. Positions opened
    // before lot_size existed (legacy rows) can't be sized, so they're
    // skipped rather than guessed — floatingPlKnown reflects whether we
    // could actually account for at least one relevant open position.
    const hasRealAllocations = allocationByPool.size > 0;
    let floatingPl = 0;
    let accountedForAny = false;
    for (const row of openExecutionsRes.data ?? []) {
      if (row.lot_size == null) continue;
      const share =
        row.target_investor_id === userId
          ? 1
          : hasRealAllocations
            ? (allocationByPool.get(row.strategy_pool_id) ?? 0) / 100
            : null;
      if (share == null) continue;
      // Prefer the live price fetched above over the DB snapshot
      const effectivePrice = livePriceMap.get(row.asset_pair) ?? Number(row.current_price ?? row.entry_price);
      const positionPl = computePositionPl(
        row.asset_pair,
        row.side as "LONG" | "SHORT",
        Number(row.lot_size),
        Number(row.entry_price),
        effectivePrice
      );
      floatingPl += positionPl * share;
      accountedForAny = true;
    }
    floatingPl = Number(floatingPl.toFixed(2));
    const floatingPlKnown = executions.length === 0 || accountedForAny;
    const currentEquity = Number((currentBalance + floatingPl).toFixed(2));

    // ── Persist an equity snapshot (throttled) ─────────────────────────────
    // The chart is built from these persisted rows — history survives page
    // reloads, window changes, and server restarts. Throttle: at most one
    // snapshot per 30 seconds per user, but always write immediately when
    // the equity moved (so drawdowns and spikes are never lost).
    const { data: lastSnap } = await db
      .from("equity_snapshots")
      .select("equity, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSnapAge = lastSnap ? Date.now() - new Date(lastSnap.created_at).getTime() : Infinity;
    const equityMoved = !lastSnap || Math.abs(Number(lastSnap.equity) - currentEquity) >= 0.01;
    if (lastSnapAge > 30_000 || (equityMoved && lastSnapAge > 4_000)) {
      await db.from("equity_snapshots").insert({
        user_id: userId,
        balance: currentBalance,
        equity: currentEquity,
        floating_pl: floatingPl,
      });
    }

    // ── Read the persisted series for the chart ────────────────────────────
    // Last 24 hours of snapshots (up to 1000 rows). If the user has fewer
    // than 2 snapshots (brand-new account), fall back to the realized ledger
    // curve so the chart is never empty.
    const dayAgo = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: snaps } = await db
      .from("equity_snapshots")
      .select("equity, balance, created_at")
      .eq("user_id", userId)
      .gte("created_at", dayAgo)
      .order("created_at", { ascending: true })
      .limit(1000);

    const equitySeries =
      (snaps ?? []).length >= 2
        ? (snaps ?? []).map((s) => ({
            t: s.created_at,
            equity: Number(s.equity),
            balance: Number(s.balance),
          }))
        : curve.points.map((p) => ({
            t: p.date,
            equity: p.equity,
            balance: p.equity,
          }));

    return NextResponse.json({
      liveVolume: formatUsd(totalFundEquity),
      totalLiquidity: formatUsd(totalFundEquity),
      equitySeries,
      session: {
        balance: currentBalance,
        equity: currentEquity,
        floatingPl,
        floatingPlKnown,
      },
      executions,
      strategyPools,
      metrics,
    });
  } catch (error) {
    console.error("[orders-live] crashed:", error);
    return NextResponse.json({ error: "Failed to load live performance." }, { status: 500 });
  }
}
