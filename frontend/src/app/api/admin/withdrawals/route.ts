import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending | approved | rejected | null (all)

  const db = createServerClient();

  let query = db
    .from("withdrawals")
    .select(`
      id,
      user_id,
      amount_usd,
      fee_usd,
      net_usd,
      method,
      status,
      reference,
      note,
      rejection_reason,
      reviewed_at,
      created_at,
      deposit_users!withdrawals_user_id_fkey (
        full_name,
        email,
        username
      ),
      saved_bank_accounts!withdrawals_bank_account_id_fkey (
        bank_name,
        account_number,
        account_holder
      )
    `)
    .order("created_at", { ascending: false });

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/withdrawals]", error.message);
    return NextResponse.json({ error: "Failed to fetch withdrawals." }, { status: 500 });
  }

  const now = new Date();
  const startOfToday = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()).toISOString();
  const startOfMonth = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1).toISOString();

  const withdrawals = (data ?? []).map((w) => {
    const investor = w.deposit_users as { full_name?: string; email?: string; username?: string } | null;
    const bank     = w.saved_bank_accounts as { bank_name?: string; account_number?: string } | null;
    return {
      id:               w.id,
      userId:           w.user_id,
      investorName:     investor?.full_name ?? "Unknown",
      investorEmail:    investor?.email     ?? "",
      amountUsd:        Number(w.amount_usd),
      feeUsd:           Number(w.fee_usd),
      netUsd:           Number(w.net_usd),
      method:           w.method,
      bankName:         bank?.bank_name      ?? "—",
      accountNumber:    bank?.account_number ?? "—",
      reference:        w.reference,
      note:             w.note ?? null,
      status:           w.status,
      rejectionReason:  w.rejection_reason ?? null,
      reviewedAt:       w.reviewed_at ?? null,
      createdAt:        w.created_at,
    };
  });

  const stats = {
    pending:           withdrawals.filter((w) => w.status === "pending").length,
    approvedToday:     withdrawals.filter((w) => w.status === "approved" && w.reviewedAt && w.reviewedAt >= startOfToday).length,
    totalMonthUsd:     withdrawals.filter((w) => w.status === "approved" && w.createdAt >= startOfMonth)
                        .reduce((s, w) => s + w.netUsd, 0),
  };

  return NextResponse.json({ withdrawals, stats });
}
