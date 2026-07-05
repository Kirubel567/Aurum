import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const db = createServerClient();

  const [userRes, depositsRes, withdrawalsRes, ledgerRes, overridesRes, assignmentRes] =
    await Promise.all([
      db.from("deposit_users").select("*").eq("id", id).single(),
      db.from("deposits").select("id, amount_submitted, currency_submitted, settled_amount_usd, status, method, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      db.from("withdrawals").select("id, amount_usd, fee_usd, net_usd, status, method, reference, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20),
      db.from("ledger_entries").select("id, entry_type, amount, note, created_at").eq("account_id", id).order("created_at", { ascending: false }).limit(30),
      db.from("balance_overrides").select("id, amount_usd, reason, performed_by, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(10),
      db.from("account_manager_assignments")
        .select("admin_id, assigned_at, deposit_users!account_manager_assignments_admin_id_fkey ( id, full_name )")
        .eq("investor_id", id)
        .maybeSingle(),
    ]);

  if (userRes.error || !userRes.data) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const walletRes = await db.from("wallets").select("balance, updated_at").eq("user_id", id).single();

  return NextResponse.json({
    user: {
      ...userRes.data,
      balance: walletRes.data?.balance ?? 0,
    },
    deposits:     depositsRes.data    ?? [],
    withdrawals:  withdrawalsRes.data ?? [],
    ledger:       ledgerRes.data      ?? [],
    overrides:    overridesRes.data   ?? [],
    assignment:   assignmentRes.data,
  });
}
