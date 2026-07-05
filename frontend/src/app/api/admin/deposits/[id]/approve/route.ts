import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { sendInvestorApprovalEmail } from "@/src/features/onboarding/lib/email";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

// ECB currencies that frankfurter.app can serve (base: USD)
const ECB_CURRENCIES = new Set(["EUR", "GBP", "CAD", "AUD", "NZD", "CHF", "JPY", "DKK", "NOK", "SEK"]);

async function fetchFxRate(currency: string): Promise<number | null> {
  if (currency === "USD") return 1.0;
  if (!ECB_CURRENCIES.has(currency)) return null;
  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${currency}&to=USD`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const body = await res.json() as { rates?: Record<string, number> };
    return body.rates?.USD ?? null;
  } catch {
    return null;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden: super_admin only." }, { status: 401 });
  }

  let body: { fxRate?: number } = {};
  try {
    body = await request.json() as { fxRate?: number };
  } catch { /* no body is fine */ }

  const db = createServerClient();

  // Fetch deposit to determine currency
  const { data: deposit, error: fetchErr } = await db
    .from("deposits")
    .select("id, currency_submitted, status, user_id")
    .eq("id", id)
    .single();

  if (fetchErr || !deposit) {
    return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  }
  if (deposit.status !== "pending") {
    return NextResponse.json({ error: `Deposit is already ${deposit.status}.` }, { status: 409 });
  }

  // Determine FX rate
  let fxRate: number;
  const currency = (deposit.currency_submitted as string).toUpperCase();

  if (typeof body.fxRate === "number" && body.fxRate > 0) {
    // Admin explicitly provided a rate (highest priority)
    fxRate = body.fxRate;
  } else if (currency === "USD") {
    fxRate = 1.0;
  } else {
    // Try to auto-fetch
    const autoRate = await fetchFxRate(currency);
    if (autoRate == null) {
      return NextResponse.json(
        {
          error: `Cannot auto-fetch FX rate for ${currency}. Please provide the current rate via the fxRate field.`,
          requiresFxRate: true,
          currency,
        },
        { status: 400 }
      );
    }
    fxRate = autoRate;
  }

  // Call the atomic RPC
  const { data: result, error: rpcErr } = await db.rpc("approve_deposit", {
    p_deposit_id:  id,
    p_reviewed_by: session.user.id,
    p_fx_rate:     fxRate,
  });

  if (rpcErr) {
    const msg = rpcErr.message ?? "";
    if (msg.includes("BELOW_MINIMUM_DEPOSIT")) {
      return NextResponse.json({ error: msg.split(": ").slice(1).join(": ") || "Settled amount is below the minimum deposit." }, { status: 422 });
    }
    if (msg.includes("DEPOSIT_NOT_PENDING")) {
      return NextResponse.json({ error: "Deposit is no longer pending." }, { status: 409 });
    }
    console.error("[admin/deposits/approve] RPC error:", msg);
    return NextResponse.json({ error: "Approval failed. Please try again." }, { status: 500 });
  }

  // Non-critical side-effects: email + notification (fire & forget)
  const { data: investor } = await db
    .from("deposit_users")
    .select("email, full_name")
    .eq("id", deposit.user_id)
    .single();

  if (investor) {
    await Promise.allSettled([
      sendInvestorApprovalEmail(investor.email, investor.full_name ?? "Investor"),
      insertNotification({
        userId:   deposit.user_id as string,
        type:     "deposit_status",
        title:    "Deposit approved",
        body:     "Your deposit has been verified and approved. Your portal is now fully unlocked.",
        linkPath: "/wallet",
      }),
    ]);
  }

  // Audit log (service-role write — no RLS)
  await db.from("audit_log").insert({
    actor_id:     session.user.id,
    actor_role:   session.user.role,
    action:       "deposit_approved",
    target_table: "deposits",
    target_id:    id,
    metadata:     { fx_rate: fxRate, settled_amount_usd: (result as { settled_amount_usd?: number })?.settled_amount_usd },
  });

  return NextResponse.json({ success: true, result });
}
