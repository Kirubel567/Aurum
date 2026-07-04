import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { computePositionPl } from "@/src/lib/trading/lot-size";

// PATCH /api/admin/console/executions/[id]/close
// super_admin may close anything (broadcast or targeted). An `admin` may
// only close a trade targeted at one of their own assigned investors.
//
// IMPORTANT: this route calls close_trade_execution() via the service-role
// client, so auth.uid() is NULL inside the RPC and its own internal
// permission branch never fires for this call path — the RPC's check is
// real defense-in-depth only for a hypothetical direct-JWT caller. The
// actual enforcement for THIS route has to happen here, explicitly.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const db = createServerClient();

    const { data: execution } = await db
      .from("trade_executions")
      .select("asset_pair, side, lot_size, current_price, entry_price, target_investor_id, status")
      .eq("id", id)
      .maybeSingle();
    if (!execution) {
      return NextResponse.json({ error: "Position not found." }, { status: 404 });
    }

    if (session.user.role === "admin") {
      if (execution.target_investor_id == null) {
        return NextResponse.json(
          { error: "Only the Platform Controller can close a pool-wide broadcast." },
          { status: 403 }
        );
      }
      const { data: assignment } = await db
        .from("account_manager_assignments")
        .select("investor_id")
        .eq("investor_id", execution.target_investor_id)
        .eq("admin_id", session.user.id)
        .maybeSingle();
      if (!assignment) {
        return NextResponse.json(
          { error: "You can only close trades for investors assigned to you." },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // closePrice defaults to the position's last mark-to-market price — the
    // console already keeps current_price fresh via the price-update route,
    // so the admin isn't re-typing a number that's already on screen. An
    // explicit body.closePrice still overrides it (e.g. a fill different
    // from the last quoted mark).
    let closePrice = body.closePrice != null ? Number(body.closePrice) : NaN;
    if (!(closePrice > 0)) {
      closePrice = Number(execution.current_price ?? execution.entry_price ?? NaN);
    }
    if (!(closePrice > 0)) {
      return NextResponse.json(
        { error: "No current price is set for this position — provide closePrice explicitly." },
        { status: 400 }
      );
    }

    // realizedPlUsd auto-computes from lot_size × real contract-size
    // convention × the actual price move — no longer an admin guess, unless
    // this is a pre-lot-size trade (lot_size NULL) or the admin explicitly
    // overrides it (e.g. a fill/settlement that differs from the marked price).
    let realizedPlUsd = body.realizedPlUsd != null ? Number(body.realizedPlUsd) : NaN;
    if (!Number.isFinite(realizedPlUsd)) {
      if (execution.lot_size == null) {
        return NextResponse.json(
          { error: "This position has no lot size on record — provide realizedPlUsd explicitly." },
          { status: 400 }
        );
      }
      realizedPlUsd = computePositionPl(
        execution.asset_pair,
        execution.side,
        Number(execution.lot_size),
        Number(execution.entry_price),
        closePrice
      );
    }

    const { data, error } = await db.rpc("close_trade_execution", {
      p_execution_id: id,
      p_close_price: closePrice,
      p_realized_pl_usd: realizedPlUsd,
    });

    if (error) {
      const known = /ALREADY_CLOSED|EXECUTION_NOT_FOUND/.exec(error.message)?.[0];
      console.error("[console-close] RPC failed:", error.message);
      return NextResponse.json(
        { error: known === "ALREADY_CLOSED" ? "Position is already closed." : known === "EXECUTION_NOT_FOUND" ? "Position not found." : "Failed to close position." },
        { status: known ? 409 : 500 }
      );
    }

    await db.from("manual_trade_adjustments").insert({
      trade_execution_id: id,
      adjusted_by: session.user.id,
      adjustment_type: "close",
      note: `Closed @ ${closePrice}, P/L ${realizedPlUsd} USD, ${data?.investors_credited ?? 0} investor(s) credited`,
    });

    return NextResponse.json({ result: data });
  } catch (error) {
    console.error("[console-close] crashed:", error);
    return NextResponse.json({ error: "Failed to close position." }, { status: 500 });
  }
}
