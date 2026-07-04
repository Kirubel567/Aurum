import { NextRequest, NextResponse } from "next/server";

import { createServerClient } from "@/src/lib/supabase/server";

// POST /api/cron/accrue-daily-yield — the scheduled daily yield run.
// Blueprint Phase 1 allows this Route-Handler form in place of an Edge
// Function; point a scheduler (Vercel Cron, or any daily trigger) here with
// the x-cron-secret header. The RPC itself is idempotent per (user, day),
// so double-firing the schedule cannot double-credit anyone.
//
// DAILY_YIELD_RATE env (e.g. "0.0032" = 0.32%/day) is a stopgap until
// Phase 16's system_settings and Phase 2's per-pool rates exist.
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[accrue-daily-yield] CRON_SECRET is not configured");
    return NextResponse.json({ error: "Cron not configured." }, { status: 503 });
  }
  if (request.headers.get("x-cron-secret") !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rate = Number(process.env.DAILY_YIELD_RATE ?? "0.0032");
  if (!Number.isFinite(rate) || rate <= 0 || rate >= 1) {
    console.error("[accrue-daily-yield] invalid DAILY_YIELD_RATE:", process.env.DAILY_YIELD_RATE);
    return NextResponse.json({ error: "Invalid yield rate configuration." }, { status: 503 });
  }

  try {
    const db = createServerClient();
    const today = new Date().toISOString().slice(0, 10);

    const { data: investors, error } = await db
      .from("deposit_users")
      .select("id")
      .eq("role", "investor")
      .eq("deposit_status", "approved");

    if (error) {
      console.error("[accrue-daily-yield] investor query failed:", error.message);
      return NextResponse.json({ error: "Failed to list investors." }, { status: 500 });
    }

    let credited = 0;
    let skipped = 0;
    const failures: { userId: string; error: string }[] = [];

    for (const investor of investors ?? []) {
      const { data, error: rpcError } = await db.rpc("accrue_daily_yield", {
        p_user_id: investor.id,
        p_period_date: today,
        p_yield_rate: rate,
      });
      if (rpcError) {
        failures.push({ userId: investor.id, error: rpcError.message });
      } else if (data?.skipped) {
        skipped++;
      } else {
        credited++;
      }
    }

    if (failures.length > 0) {
      console.error("[accrue-daily-yield] failures:", JSON.stringify(failures));
    }

    return NextResponse.json({
      date: today,
      rate,
      credited,
      skipped,
      failed: failures.length,
    });
  } catch (error) {
    console.error("[accrue-daily-yield] crashed:", error);
    return NextResponse.json({ error: "Accrual run failed." }, { status: 500 });
  }
}
