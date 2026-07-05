import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role === "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // "pending" | "approved" | "rejected" | null (all)

  const db = createServerClient();

  let query = db
    .from("deposits")
    .select(`
      id,
      user_id,
      amount_submitted,
      currency_submitted,
      fx_rate_applied,
      settled_amount_usd,
      method,
      method_detail,
      proof_file_path,
      tx_reference,
      status,
      rejection_reason,
      reviewed_at,
      created_at,
      metadata,
      deposit_users!deposits_user_id_fkey (
        full_name,
        email,
        username
      )
    `)
    .order("created_at", { ascending: false });

  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/deposits] list:", error.message);
    return NextResponse.json({ error: "Failed to fetch deposits." }, { status: 500 });
  }

  const deposits = (data ?? []).map((row) => ({
    id:                  row.id,
    userId:              row.user_id,
    investorName:        (row.deposit_users as { full_name?: string; email?: string } | null)?.full_name ?? "Unknown",
    investorEmail:       (row.deposit_users as { email?: string } | null)?.email ?? "",
    amountSubmitted:     Number(row.amount_submitted),
    currencySubmitted:   row.currency_submitted,
    fxRateApplied:       row.fx_rate_applied != null ? Number(row.fx_rate_applied) : null,
    settledAmountUsd:    row.settled_amount_usd != null ? Number(row.settled_amount_usd) : null,
    method:              row.method,
    methodDetail:        row.method_detail,
    hasProof:            !!row.proof_file_path,
    txReference:         row.tx_reference,
    status:              row.status,
    rejectionReason:     row.rejection_reason ?? null,
    reviewedAt:          row.reviewed_at ?? null,
    createdAt:           row.created_at,
    isLegacy:            !!(row.metadata as { source?: string } | null)?.source?.includes("legacy"),
  }));

  // Stats for the header cards
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const allDeposits = deposits;
  const stats = {
    pending:       allDeposits.filter((d) => d.status === "pending").length,
    approvedToday: allDeposits.filter((d) => d.status === "approved" && d.reviewedAt && d.reviewedAt >= startOfToday).length,
    totalMonthUsd: allDeposits
      .filter((d) => d.status === "approved" && d.createdAt >= startOfMonth && d.settledAmountUsd != null)
      .reduce((sum, d) => sum + (d.settledAmountUsd ?? 0), 0),
  };

  return NextResponse.json({ deposits, stats });
}
