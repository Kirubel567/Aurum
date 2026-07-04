import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// PATCH /api/admin/console/executions/[id]/price — mark-to-market update
// for an open position. Touches no wallet/ledger (nothing is realized yet),
// so this is lower-risk than open/close: super_admin can mark any position;
// an `admin` can mark pool broadcasts too (read-only benefit, harmless) and
// their own targeted trades, but never another manager's targeted trade.
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

    if (session.user.role === "admin") {
      const { data: execution } = await db
        .from("trade_executions")
        .select("target_investor_id")
        .eq("id", id)
        .maybeSingle();
      if (execution?.target_investor_id != null) {
        const { data: assignment } = await db
          .from("account_manager_assignments")
          .select("investor_id")
          .eq("investor_id", execution.target_investor_id)
          .eq("admin_id", session.user.id)
          .maybeSingle();
        if (!assignment) {
          return NextResponse.json(
            { error: "You can only update prices for your own assigned investors' trades." },
            { status: 403 }
          );
        }
      }
    } else if (session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const currentPrice = Number(body.currentPrice);
    if (!(currentPrice > 0)) {
      return NextResponse.json({ error: "A positive currentPrice is required." }, { status: 400 });
    }

    const { data, error } = await db
      .from("trade_executions")
      .update({ current_price: currentPrice })
      .eq("id", id)
      .eq("status", "open")
      .select()
      .maybeSingle();

    if (error) {
      console.error("[console-price] failed:", error.message);
      return NextResponse.json({ error: "Failed to update price." }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: "Open position not found." }, { status: 404 });
    }

    await db.from("manual_trade_adjustments").insert({
      trade_execution_id: id,
      adjusted_by: session.user.id,
      adjustment_type: "price_update",
      note: `Price → ${currentPrice}`,
    });

    return NextResponse.json({ execution: data });
  } catch (error) {
    console.error("[console-price] crashed:", error);
    return NextResponse.json({ error: "Failed to update price." }, { status: 500 });
  }
}
