import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function GET() {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const db = createServerClient();

  const { data, error } = await db
    .from("withdrawals")
    .select(`
      id,
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
      saved_bank_accounts!withdrawals_bank_account_id_fkey (
        bank_name,
        account_number,
        account_holder
      )
    `)
    .eq("user_id", session.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[withdraw/history]", error.message);
    return NextResponse.json({ error: "Failed to load withdrawal history." }, { status: 500 });
  }

  const history = (data ?? []).map((w) => {
    const bank = w.saved_bank_accounts as { bank_name?: string; account_number?: string; account_holder?: string } | null;
    const createdAt = new Date(w.created_at);
    const daysToAdd = w.method === "express" ? 1 : 3;
    const estimated = new Date(createdAt.getTime() + daysToAdd * 86400_000);

    return {
      id:               w.id,
      date:             createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      amount:           Number(w.amount_usd),
      fee:              Number(w.fee_usd),
      netAmount:        Number(w.net_usd),
      destination:      bank?.account_number ?? "—",
      bankName:         bank?.bank_name      ?? "Unknown bank",
      method:           w.method as "standard" | "express",
      status:           w.status as "pending" | "processing" | "approved" | "completed" | "rejected",
      reference:        w.reference,
      estimatedArrival: estimated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      note:             w.note ?? null,
      rejectionReason:  w.rejection_reason ?? null,
      reviewedAt:       w.reviewed_at ?? null,
    };
  });

  return NextResponse.json({ history });
}
