import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export interface LiquidityPool {
  id: string;
  name: string;
  tag: string | null;
  tagColor: string; // 'gold' | 'slate' | 'dark'
  description: string | null;
  sortOrder: number;
  targetAllocationPct: number;
  allocatedUsd: number; // capital currently allocated: Σ investor wallet balance × allocation_pct
  allocatedPct: number; // allocatedUsd as % of total AUM
  investorCount: number;
  openTrades: number;
}

export interface LiquiditySummary {
  totalAum: number;
  pools: LiquidityPool[];
}

// GET /api/admin/liquidity — real pool liquidity from strategy_pools,
// investor_pool_allocations, wallets and trade_executions. Staff only.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    const [pools, allocations, wallets, openTrades] = await Promise.all([
      db
        .from("strategy_pools")
        .select("id, name, tag, tag_color, description, sort_order, target_allocation_pct")
        .eq("active", true)
        .order("sort_order"),
      db
        .from("investor_pool_allocations")
        .select("user_id, strategy_pool_id, allocation_pct"),
      db.from("wallets").select("user_id, balance"),
      db
        .from("trade_executions")
        .select("strategy_pool_id")
        .eq("status", "open"),
    ]);

    if (pools.error) {
      return NextResponse.json({ error: pools.error.message }, { status: 500 });
    }

    const balanceByUser = new Map<string, number>();
    for (const w of wallets.data ?? []) {
      balanceByUser.set(
        String(w.user_id),
        (balanceByUser.get(String(w.user_id)) ?? 0) + Number(w.balance ?? 0)
      );
    }

    const totalAum = [...balanceByUser.values()].reduce((s, b) => s + b, 0);

    const allocatedByPool = new Map<string, { usd: number; investors: Set<string> }>();
    for (const a of allocations.data ?? []) {
      const poolId = String(a.strategy_pool_id);
      const balance = balanceByUser.get(String(a.user_id)) ?? 0;
      const usd = balance * (Number(a.allocation_pct) / 100);
      const entry = allocatedByPool.get(poolId) ?? { usd: 0, investors: new Set<string>() };
      entry.usd += usd;
      if (balance > 0) entry.investors.add(String(a.user_id));
      allocatedByPool.set(poolId, entry);
    }

    const openTradesByPool = new Map<string, number>();
    for (const t of openTrades.data ?? []) {
      const poolId = String(t.strategy_pool_id);
      openTradesByPool.set(poolId, (openTradesByPool.get(poolId) ?? 0) + 1);
    }

    const result: LiquidityPool[] = (pools.data ?? []).map((p) => {
      const alloc = allocatedByPool.get(String(p.id)) ?? { usd: 0, investors: new Set<string>() };
      return {
        id: p.id,
        name: p.name,
        tag: p.tag,
        tagColor: p.tag_color,
        description: p.description,
        sortOrder: p.sort_order,
        targetAllocationPct: Number(p.target_allocation_pct),
        allocatedUsd: Number(alloc.usd.toFixed(2)),
        allocatedPct: totalAum > 0 ? Number(((alloc.usd / totalAum) * 100).toFixed(1)) : 0,
        investorCount: alloc.investors.size,
        openTrades: openTradesByPool.get(String(p.id)) ?? 0,
      };
    });

    const summary: LiquiditySummary = {
      totalAum: Number(totalAum.toFixed(2)),
      pools: result,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[admin-liquidity] crashed:", error);
    return NextResponse.json({ error: "Failed to load liquidity." }, { status: 500 });
  }
}
