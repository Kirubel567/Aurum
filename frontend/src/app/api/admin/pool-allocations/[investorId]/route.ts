import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/admin/pool-allocations/[investorId] — every active pool with
// this investor's current weighting (0 if unset). Staff read access.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ investorId: string }> }
) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { investorId } = await params;

    const db = createServerClient();
    const [investor, pools, allocations] = await Promise.all([
      db.from("deposit_users").select("id, full_name, email").eq("id", investorId).eq("role", "investor").maybeSingle(),
      db.from("strategy_pools").select("id, name, tag_color, sort_order").eq("active", true).order("sort_order"),
      db.from("investor_pool_allocations").select("strategy_pool_id, allocation_pct").eq("user_id", investorId),
    ]);

    if (!investor.data) {
      return NextResponse.json({ error: "Investor not found." }, { status: 404 });
    }

    const pctByPool = new Map((allocations.data ?? []).map((a) => [a.strategy_pool_id, Number(a.allocation_pct)]));
    const pools_ = (pools.data ?? []).map((pool) => ({
      id: pool.id,
      name: pool.name,
      tagColor: pool.tag_color,
      allocationPct: pctByPool.get(pool.id) ?? 0,
    }));

    return NextResponse.json({
      investor: { id: investor.data.id, name: investor.data.full_name, email: investor.data.email },
      pools: pools_,
    });
  } catch (error) {
    console.error("[pool-allocations] get crashed:", error);
    return NextResponse.json({ error: "Failed to load allocations." }, { status: 500 });
  }
}

// PUT /api/admin/pool-allocations/[investorId] — replace this investor's
// full allocation set. super_admin only (this determines each investor's
// share of every future close_trade_execution() distribution — a real
// financial-configuration action, not cosmetic).
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ investorId: string }> }
) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only the Platform Controller can change pool allocations." },
        { status: 403 }
      );
    }
    const { investorId } = await params;

    const body = await request.json().catch(() => ({}));
    const allocations: unknown[] | null = Array.isArray(body.allocations) ? body.allocations : null;
    if (!allocations || allocations.length === 0) {
      return NextResponse.json({ error: "allocations array is required." }, { status: 400 });
    }

    const cleaned: { poolId: string; allocationPct: number }[] = allocations
      .map((a) => {
        const row = a as { poolId?: string; allocationPct?: number };
        return {
          poolId: String(row.poolId ?? ""),
          allocationPct: Number(row.allocationPct ?? 0),
        };
      })
      .filter((a) => a.poolId);

    if (cleaned.some((a) => !(a.allocationPct >= 0) || a.allocationPct > 100)) {
      return NextResponse.json({ error: "Each allocation must be between 0 and 100." }, { status: 400 });
    }
    const total = cleaned.reduce((s, a) => s + a.allocationPct, 0);
    if (Math.abs(total - 100) > 0.01) {
      return NextResponse.json({ error: `Allocations must sum to 100% (currently ${total}%).` }, { status: 400 });
    }

    const db = createServerClient();
    const { data: investor } = await db.from("deposit_users").select("id").eq("id", investorId).eq("role", "investor").maybeSingle();
    if (!investor) {
      return NextResponse.json({ error: "Investor not found." }, { status: 404 });
    }

    // Replace-all: delete existing rows for this investor, then insert the
    // submitted set. Simpler and just as safe as a diff/upsert here since
    // this table has no FK dependents that would break on delete+reinsert.
    const nonZero = cleaned.filter((a) => a.allocationPct > 0);
    const { error: deleteError } = await db.from("investor_pool_allocations").delete().eq("user_id", investorId);
    if (deleteError) {
      console.error("[pool-allocations] delete failed:", deleteError.message);
      return NextResponse.json({ error: "Failed to update allocations." }, { status: 500 });
    }
    if (nonZero.length > 0) {
      const { error: insertError } = await db.from("investor_pool_allocations").insert(
        nonZero.map((a) => ({
          user_id: investorId,
          strategy_pool_id: a.poolId,
          allocation_pct: a.allocationPct,
          set_by: session.user.id,
        }))
      );
      if (insertError) {
        console.error("[pool-allocations] insert failed:", insertError.message);
        return NextResponse.json({ error: "Failed to update allocations." }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[pool-allocations] put crashed:", error);
    return NextResponse.json({ error: "Failed to update allocations." }, { status: 500 });
  }
}
