import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const userId = session.user.id;
  const db     = createServerClient();

  const { searchParams } = new URL(request.url);
  const tab  = searchParams.get("tab") ?? "history";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  // ── Transaction History tab ───────────────────────────────────────────────
  if (tab === "history") {
    const { data, error, count } = await db
      .from("ledger_entries")
      .select("id, created_at, entry_type, amount, note, reference_id", { count: "exact" })
      .eq("account_id", userId)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("[wallet/transactions history]", error.message);
      return NextResponse.json({ error: "Failed to load transactions." }, { status: 500 });
    }

    const entries = (data ?? []).map((e) => ({
      id:          e.id,
      createdAt:   e.created_at,
      entryType:   e.entry_type,
      amount:      Number(e.amount),
      note:        e.note ?? null,
      referenceId: e.reference_id ?? null,
    }));

    return NextResponse.json({ entries, total: count ?? 0, page, pageSize: PAGE_SIZE });
  }

  // ── Withdrawal History tab ────────────────────────────────────────────────
  if (tab === "withdrawals") {
    const { data, error } = await db
      .from("withdrawals")
      .select("id, created_at, amount_usd, fee_usd, net_usd, method, status, reference, reviewed_at, tx_hash, rejection_reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[wallet/transactions withdrawals]", error.message);
      return NextResponse.json({ error: "Failed to load withdrawal history." }, { status: 500 });
    }

    const withdrawals = (data ?? []).map((w) => ({
      id:               w.id,
      createdAt:        w.created_at,
      amountUsd:        Number(w.amount_usd),
      feeUsd:           Number(w.fee_usd),
      netUsd:           Number(w.net_usd),
      method:           w.method,
      status:           w.status,
      reference:        w.reference,
      reviewedAt:       w.reviewed_at ?? null,
      txHash:           w.tx_hash ?? null,
      rejectionReason:  w.rejection_reason ?? null,
    }));

    return NextResponse.json({ withdrawals });
  }

  // ── Wallet Details tab ────────────────────────────────────────────────────
  if (tab === "details") {
    const [walletRes, userRes, depositRes] = await Promise.all([
      db.from("wallets").select("balance, locked_principal").eq("user_id", userId).single(),
      db.from("deposit_users").select("full_name, deposit_status, created_at").eq("id", userId).single(),
      db
        .from("deposits")
        .select("reviewed_at, tx_reference")
        .eq("user_id", userId)
        .eq("status", "approved")
        .order("reviewed_at", { ascending: true })
        .limit(1)
        .single(),
    ]);

    const walletId = "WLT-" + userId.replace(/-/g, "").slice(-6).toUpperCase();

    return NextResponse.json({
      walletId,
      status:           walletRes.data ? "Active" : "Inactive",
      activatedOn:      depositRes.data?.reviewed_at ?? userRes.data?.created_at ?? null,
      currency:         "USD — US Dollar",
      accountType:      "Standard Investor",
      withdrawalMethod: "Bank Transfer",
      kycLevel:         "Level 2 — Verified",
      dailyLimit:       10_000,
      monthlyLimit:     50_000,
    });
  }

  return NextResponse.json({ error: "Invalid tab." }, { status: 400 });
}
