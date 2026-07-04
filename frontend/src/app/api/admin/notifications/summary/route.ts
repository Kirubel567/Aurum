import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

// GET /api/admin/notifications/summary — the counts behind the admin
// sidebar badges and top-bar bell. Staff only.
export async function GET() {
  try {
    const session = await getDepositSessionCookie();
    if (!session?.user || session.user.role === "investor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServerClient();

    const [newDeposits, legacyPending, withdrawals, messages] = await Promise.all([
      db.from("deposits").select("*", { count: "exact", head: true }).eq("status", "pending"),
      // The deposits table is empty until Phase 4/13's legacy backfill runs —
      // real pending requests currently live on deposit_users directly. Count
      // both so the badge never lies about work waiting for review.
      db
        .from("deposit_users")
        .select("*", { count: "exact", head: true })
        .eq("deposit_status", "pending")
        .eq("role", "investor"),
      db.from("withdrawals").select("*", { count: "exact", head: true }).eq("status", "pending"),
      db
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("read_by_admin", false)
        .eq("sender_role", "investor"),
    ]);

    return NextResponse.json({
      pendingDeposits: (newDeposits.count ?? 0) + (legacyPending.count ?? 0),
      pendingWithdrawals: withdrawals.count ?? 0,
      unreadMessages: messages.count ?? 0,
      // Defined fully in Phase 12 — until the system_alerts source exists
      // this is honestly zero, not a mock number.
      systemAlerts: 0,
    });
  } catch (error) {
    console.error("[admin-summary] unexpected failure:", error);
    return NextResponse.json({ error: "Failed to load summary." }, { status: 500 });
  }
}
