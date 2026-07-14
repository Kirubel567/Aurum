import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export interface TradeCategoryBreakdown {
  id: string;
  name: string;
  tag: string | null;
  tagColor: string; // 'gold' | 'slate' | 'dark'
  description: string | null;
  sortOrder: number;
  tradeCount: number;   // total trades ever taken in this category
  tradePct: number;     // tradeCount as % of all trades taken
  openTrades: number;
}

export interface LiquiditySummary {
  totalTrades: number;
  totalAum: number; // informational context only, not tied to categories
  pools: TradeCategoryBreakdown[];
}

// GET /api/admin/liquidity — platform-wide breakdown of how trades taken so
// far are distributed across the three trade categories (Forex Majors /
// Commodities / Global Indices). Every investor's capital is managed
// individually — this is a classification view, not a capital-allocation
// view. Staff only.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    const [pools, allTrades, openTrades, wallets] = await Promise.all([
      db
        .from("strategy_pools")
        .select("id, name, tag, tag_color, description, sort_order")
        .eq("active", true)
        .order("sort_order"),
      db.from("trade_executions").select("id, strategy_pool_id"),
      db
        .from("trade_executions")
        .select("strategy_pool_id")
        .eq("status", "open"),
      db.from("wallets").select("balance"),
    ]);

    if (pools.error) {
      return NextResponse.json({ error: pools.error.message }, { status: 500 });
    }

    const totalTrades = (allTrades.data ?? []).length;
    const totalAum = (wallets.data ?? []).reduce((s, w) => s + Number(w.balance ?? 0), 0);

    const countByPool = new Map<string, number>();
    for (const t of allTrades.data ?? []) {
      countByPool.set(t.strategy_pool_id, (countByPool.get(t.strategy_pool_id) ?? 0) + 1);
    }
    const openByPool = new Map<string, number>();
    for (const t of openTrades.data ?? []) {
      openByPool.set(t.strategy_pool_id, (openByPool.get(t.strategy_pool_id) ?? 0) + 1);
    }

    const result: TradeCategoryBreakdown[] = (pools.data ?? []).map((p) => {
      const count = countByPool.get(String(p.id)) ?? 0;
      return {
        id: p.id,
        name: p.name,
        tag: p.tag,
        tagColor: p.tag_color,
        description: p.description,
        sortOrder: p.sort_order,
        tradeCount: count,
        tradePct: totalTrades > 0 ? Number(((count / totalTrades) * 100).toFixed(1)) : 0,
        openTrades: openByPool.get(String(p.id)) ?? 0,
      };
    });

    const summary: LiquiditySummary = {
      totalTrades,
      totalAum: Number(totalAum.toFixed(2)),
      pools: result,
    };

    return NextResponse.json(summary);
  } catch (error) {
    console.error("[admin-liquidity] crashed:", error);
    return NextResponse.json({ error: "Failed to load trade category breakdown." }, { status: 500 });
  }
}
