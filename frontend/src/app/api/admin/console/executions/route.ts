import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { validateTakeProfitStopLoss } from "@/src/lib/trading/risk-reward";
import { nominalLeverageLabel } from "@/src/lib/trading/lot-size";

// Trading console — list (staff) and open (super_admin) trade executions.

export async function GET(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Default to open-only — the console's primary job is managing what's
    // currently running. Pass ?status=closed explicitly for history.
    const status = request.nextUrl.searchParams.get("status") ?? "open";
    const db = createServerClient();
    let query = db
      .from("trade_executions")
      .select("id, strategy_pool_id, asset_pair, side, leverage, lot_size, entry_price, current_price, take_profit_price, stop_loss_price, status, realized_pl_usd, opened_at, closed_at, target_investor_id, strategy_pools(name), deposit_users!trade_executions_target_investor_id_fkey(full_name)")
      .order("opened_at", { ascending: false })
      .limit(100);
    if (status === "open" || status === "closed") {
      query = query.eq("status", status);
    }

    // An `admin` sees every pool broadcast (read-only, per B.2) plus only
    // the targeted trades belonging to their own assigned investors — never
    // another manager's targeted trades.
    if (session.user.role === "admin") {
      const { data: assigned } = await db
        .from("account_manager_assignments")
        .select("investor_id")
        .eq("admin_id", session.user.id);
      const investorIds = (assigned ?? []).map((a) => a.investor_id);
      query =
        investorIds.length > 0
          ? query.or(`target_investor_id.is.null,target_investor_id.in.(${investorIds.join(",")})`)
          : query.is("target_investor_id", null);
    }

    const [{ data, error }, pools] = await Promise.all([
      query,
      db.from("strategy_pools").select("id, name, sort_order").eq("active", true).order("sort_order"),
    ]);
    if (error) {
      console.error("[console-executions] list failed:", error.message);
      return NextResponse.json({ error: "Failed to load executions." }, { status: 500 });
    }
    return NextResponse.json({ executions: data ?? [], pools: pools.data ?? [] });
  } catch (error) {
    console.error("[console-executions] crashed:", error);
    return NextResponse.json({ error: "Failed to load executions." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { strategyPoolId, assetPair, side, lotSize, entryPrice, takeProfitPrice, stopLossPrice, note, targetInvestorId } = body;
    if (!strategyPoolId || !assetPair?.trim() || !["LONG", "SHORT"].includes(side) || !(Number(entryPrice) > 0) || !(Number(lotSize) > 0)) {
      return NextResponse.json(
        { error: "strategyPoolId, assetPair, side (LONG/SHORT), a positive entryPrice and a positive lotSize are required." },
        { status: 400 }
      );
    }

    const db = createServerClient();

    // Permission split: an `admin` (Account Manager) may only open trades
    // targeted at their own assigned investors — never a pool-wide
    // broadcast. `super_admin` may broadcast (omit targetInvestorId) or
    // target any single investor.
    const resolvedTargetId: string | null = targetInvestorId ? String(targetInvestorId) : null;
    if (session.user.role === "admin") {
      if (!resolvedTargetId) {
        return NextResponse.json(
          { error: "Account Managers must target a specific assigned investor — only the Platform Controller can broadcast to a whole pool." },
          { status: 403 }
        );
      }
      const { data: assignment } = await db
        .from("account_manager_assignments")
        .select("investor_id")
        .eq("investor_id", resolvedTargetId)
        .eq("admin_id", session.user.id)
        .maybeSingle();
      if (!assignment) {
        return NextResponse.json(
          { error: "You can only open trades for investors assigned to you." },
          { status: 403 }
        );
      }
    } else if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (resolvedTargetId) {
      const { data: investor } = await db
        .from("deposit_users")
        .select("id")
        .eq("id", resolvedTargetId)
        .eq("role", "investor")
        .maybeSingle();
      if (!investor) {
        return NextResponse.json({ error: "Target investor not found." }, { status: 404 });
      }
    }

    const entry = Number(entryPrice);
    const tp = takeProfitPrice != null && takeProfitPrice !== "" ? Number(takeProfitPrice) : null;
    const sl = stopLossPrice != null && stopLossPrice !== "" ? Number(stopLossPrice) : null;
    if ((tp != null && !(tp > 0)) || (sl != null && !(sl > 0))) {
      return NextResponse.json({ error: "Take profit and stop loss must be positive numbers." }, { status: 400 });
    }
    const validationError = validateTakeProfitStopLoss(side, entry, tp, sl);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const upperPair = assetPair.trim().toUpperCase();
    const { data, error } = await db
      .from("trade_executions")
      .insert({
        strategy_pool_id: strategyPoolId,
        asset_pair: upperPair,
        side,
        lot_size: Number(lotSize),
        leverage: nominalLeverageLabel(upperPair), // derived, not admin-entered
        entry_price: entry,
        current_price: entry,
        take_profit_price: tp,
        stop_loss_price: sl,
        target_investor_id: resolvedTargetId,
      })
      .select()
      .single();

    if (error) {
      console.error("[console-executions] open failed:", error.message);
      return NextResponse.json({ error: "Failed to open position." }, { status: 500 });
    }

    await db.from("manual_trade_adjustments").insert({
      trade_execution_id: data.id,
      adjusted_by: session.user.id,
      adjustment_type: "open",
      note: `Opened ${side} ${data.asset_pair} @ ${data.entry_price}, lot size ${lotSize}${resolvedTargetId ? `, targeted` : `, pool broadcast`}${tp != null ? `, TP ${tp}` : ""}${sl != null ? `, SL ${sl}` : ""}${note ? ` — ${String(note).slice(0, 200)}` : ""}`,
    });

    return NextResponse.json({ execution: data }, { status: 201 });
  } catch (error) {
    console.error("[console-executions] crashed:", error);
    return NextResponse.json({ error: "Failed to open position." }, { status: 500 });
  }
}
