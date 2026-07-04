import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/admin/pool-allocations/summary — platform-wide view: how many
// investors are in each pool and their average weighting. Staff only.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();
    const [pools, allocations] = await Promise.all([
      db.from("strategy_pools").select("id, name, tag_color, sort_order").eq("active", true).order("sort_order"),
      db.from("investor_pool_allocations").select("strategy_pool_id, allocation_pct"),
    ]);

    const byPool = new Map<string, { count: number; total: number }>();
    for (const row of allocations.data ?? []) {
      const entry = byPool.get(row.strategy_pool_id) ?? { count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(row.allocation_pct);
      byPool.set(row.strategy_pool_id, entry);
    }

    const summary = (pools.data ?? []).map((pool) => {
      const entry = byPool.get(pool.id) ?? { count: 0, total: 0 };
      return {
        id: pool.id,
        name: pool.name,
        tagColor: pool.tag_color,
        investorCount: entry.count,
        averageAllocationPct: entry.count > 0 ? Number((entry.total / entry.count).toFixed(1)) : 0,
      };
    });

    return NextResponse.json({ pools: summary });
  } catch (error) {
    console.error("[pool-allocations-summary] crashed:", error);
    return NextResponse.json({ error: "Failed to load summary." }, { status: 500 });
  }
}
