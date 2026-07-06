import { NextRequest, NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export interface AumPoint {
  date: string; // YYYY-MM-DD
  aum: number;
}

export interface AdminDashboardMetrics {
  totalAum: number;
  aumChangePct: number | null; // vs start of selected range; null when no history
  activeInvestors: number;
  newInvestorsToday: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  dailyPnl: number; // today's yield accrual + realized trade P/L closed today
  openTrades: number;
  chart: AumPoint[];
}

const RANGE_DAYS: Record<string, number | null> = {
  "1M": 30,
  "3M": 90,
  "1Y": 365,
  ALL: null,
};

// GET /api/admin/dashboard/metrics?range=1M|3M|1Y|ALL
// Real executive KPIs aggregated from wallets, deposit_users, deposits,
// withdrawals, yield_accrual_log, trade_executions and equity_snapshots.
// Staff only.
export async function GET(req: NextRequest) {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const range = req.nextUrl.searchParams.get("range") ?? "1M";
    const rangeDays = RANGE_DAYS[range] ?? 30;

    const db = createServerClient();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayIso = todayStart.toISOString();
    const todayDate = todayStart.toISOString().slice(0, 10);

    const rangeStart = rangeDays
      ? new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // AUM history comes from the ledger: every investor-account entry
    // (deposits, withdrawals, yield, trade P/L) summed cumulatively per day.
    // (equity_snapshots record per-investor TRADING P/L, not fund value.)
    const PLATFORM_SENTINEL = "00000000-0000-0000-0000-000000000000";
    const ledgerQuery = db
      .from("ledger_entries")
      .select("amount, created_at")
      .neq("account_id", PLATFORM_SENTINEL)
      .order("created_at", { ascending: true });

    const [
      wallets,
      approvedInvestors,
      newToday,
      pendingDeposits,
      pendingWithdrawals,
      todayYield,
      todayClosedTrades,
      openTrades,
      ledgerEntries,
    ] = await Promise.all([
      db.from("wallets").select("balance"),
      db
        .from("deposit_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "investor")
        .eq("deposit_status", "approved"),
      db
        .from("deposit_users")
        .select("id", { count: "exact", head: true })
        .eq("role", "investor")
        .gte("created_at", todayIso),
      db
        .from("deposits")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db
        .from("withdrawals")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      db
        .from("yield_accrual_log")
        .select("yield_amount_usd")
        .eq("period_date", todayDate),
      db
        .from("trade_executions")
        .select("realized_pl_usd")
        .eq("status", "closed")
        .gte("closed_at", todayIso),
      db
        .from("trade_executions")
        .select("id", { count: "exact", head: true })
        .eq("status", "open"),
      ledgerQuery,
    ]);

    const totalAum = (wallets.data ?? []).reduce(
      (sum, w) => sum + Number(w.balance ?? 0),
      0
    );

    const yieldToday = (todayYield.data ?? []).reduce(
      (sum, r) => sum + Number(r.yield_amount_usd ?? 0),
      0
    );
    const tradePnlToday = (todayClosedTrades.data ?? []).reduce(
      (sum, r) => sum + Number(r.realized_pl_usd ?? 0),
      0
    );
    const dailyPnl = yieldToday + tradePnlToday;

    // ── AUM history: cumulative ledger sum bucketed per day ──────────────────
    const entries = ledgerEntries.data ?? [];
    const rangeStartMs = rangeStart ? new Date(rangeStart).getTime() : 0;

    // Baseline: everything before the window opens.
    let running = 0;
    const perDayDelta = new Map<string, number>();
    for (const e of entries) {
      const at = new Date(e.created_at).getTime();
      if (at < rangeStartMs) {
        running += Number(e.amount);
      } else {
        const day = String(e.created_at).slice(0, 10);
        perDayDelta.set(day, (perDayDelta.get(day) ?? 0) + Number(e.amount));
      }
    }

    const chart: AumPoint[] = [];
    for (const day of [...perDayDelta.keys()].sort()) {
      running += perDayDelta.get(day)!;
      chart.push({ date: day, aum: Number(running.toFixed(2)) });
    }

    // Always end the curve at the live AUM value so the chart matches the KPI.
    if (chart.length === 0 || chart[chart.length - 1].date !== todayDate) {
      chart.push({ date: todayDate, aum: Number(totalAum.toFixed(2)) });
    } else {
      chart[chart.length - 1].aum = Number(totalAum.toFixed(2));
    }

    const firstAum = chart[0]?.aum ?? 0;
    const aumChangePct =
      chart.length > 1 && firstAum > 0
        ? Number((((totalAum - firstAum) / firstAum) * 100).toFixed(2))
        : null;

    const metrics: AdminDashboardMetrics = {
      totalAum: Number(totalAum.toFixed(2)),
      aumChangePct,
      activeInvestors: approvedInvestors.count ?? 0,
      newInvestorsToday: newToday.count ?? 0,
      pendingDeposits: pendingDeposits.count ?? 0,
      pendingWithdrawals: pendingWithdrawals.count ?? 0,
      dailyPnl: Number(dailyPnl.toFixed(2)),
      openTrades: openTrades.count ?? 0,
      chart,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("[admin-dashboard-metrics] crashed:", error);
    return NextResponse.json({ error: "Failed to load metrics." }, { status: 500 });
  }
}
