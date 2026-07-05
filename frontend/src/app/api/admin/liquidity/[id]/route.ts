import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// PATCH /api/admin/liquidity/[id] — update a pool's target allocation
// percentage (the "rebalance" action). Staff only. Validates that the sum
// of all active pools' targets stays at 100%.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { targetAllocationPct } = await req.json() as { targetAllocationPct?: number };

    if (
      typeof targetAllocationPct !== "number" ||
      !Number.isFinite(targetAllocationPct) ||
      targetAllocationPct < 0 ||
      targetAllocationPct > 100
    ) {
      return NextResponse.json(
        { error: "targetAllocationPct must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    const db = createServerClient();

    const { data: pool } = await db
      .from("strategy_pools")
      .select("id, name, target_allocation_pct")
      .eq("id", id)
      .maybeSingle();

    if (!pool) return NextResponse.json({ error: "Pool not found" }, { status: 404 });

    // The other active pools' targets + the new value must not exceed 100%.
    const { data: others } = await db
      .from("strategy_pools")
      .select("target_allocation_pct")
      .eq("active", true)
      .neq("id", id);

    const othersTotal = (others ?? []).reduce(
      (s, p) => s + Number(p.target_allocation_pct),
      0
    );
    const newTotal = othersTotal + targetAllocationPct;
    if (newTotal > 100.01) {
      return NextResponse.json(
        {
          error: `Total target allocation would be ${newTotal.toFixed(1)}% — the sum across all pools cannot exceed 100%. Other pools currently total ${othersTotal.toFixed(1)}%.`,
        },
        { status: 422 }
      );
    }

    const { error } = await db
      .from("strategy_pools")
      .update({ target_allocation_pct: targetAllocationPct })
      .eq("id", id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      pool: { id: pool.id, name: pool.name, targetAllocationPct },
    });
  } catch (error) {
    console.error("[admin-liquidity-patch] crashed:", error);
    return NextResponse.json({ error: "Failed to update pool." }, { status: 500 });
  }
}
