import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/dashboard/summary — the investor dashboard's real money numbers:
// cached wallet balance (fast path — this is why wallets exists separately
// from the append-only ledger), month-to-date yield, and the latest 5
// ledger entries as "recent transactions".
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const db = createServerClient();
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    const monthStartISO = monthStart.toISOString().slice(0, 10);

    const [wallet, mtdYield, recent] = await Promise.all([
      db
        .from("wallets")
        .select("balance, locked_principal, updated_at")
        .eq("user_id", userId)
        .eq("currency", "USD")
        .maybeSingle(),
      db
        .from("yield_accrual_log")
        .select("yield_amount_usd")
        .eq("user_id", userId)
        .gte("period_date", monthStartISO),
      db
        .from("ledger_entries")
        .select("id, entry_type, amount, currency, note, created_at")
        .eq("account_id", userId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const balance = Number(wallet.data?.balance ?? 0);
    const lockedPrincipal = Number(wallet.data?.locked_principal ?? 0);
    const monthToDateProfit = (mtdYield.data ?? []).reduce(
      (sum, row) => sum + Number(row.yield_amount_usd),
      0
    );

    return NextResponse.json({
      balance,
      lockedPrincipal,
      availableForTrading: balance - lockedPrincipal,
      monthToDateProfit: Number(monthToDateProfit.toFixed(2)),
      recentTransactions: (recent.data ?? []).map((row) => ({
        id: row.id,
        type: row.entry_type,
        amount: Number(row.amount),
        currency: row.currency,
        note: row.note,
        date: row.created_at,
      })),
    });
  } catch (error) {
    console.error("[dashboard-summary] crashed:", error);
    return NextResponse.json({ error: "Failed to load summary." }, { status: 500 });
  }
}
