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
    .from("saved_bank_accounts")
    .select("id, bank_name, account_holder, account_number, swift_code, is_primary, created_at")
    .eq("user_id", session.user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[withdraw/banks GET]", error.message);
    return NextResponse.json({ error: "Failed to load bank accounts." }, { status: 500 });
  }

  const banks = (data ?? []).map((b) => ({
    id:            b.id,
    bankName:      b.bank_name,
    accountHolder: b.account_holder,
    accountNumber: b.account_number,
    swiftCode:     b.swift_code ?? undefined,
    isPrimary:     b.is_primary,
  }));

  return NextResponse.json({ banks });
}

export async function POST(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let body: { bankName?: string; accountHolder?: string; accountNumber?: string; swiftCode?: string; isPrimary?: boolean } = {};
  try { body = await request.json() as typeof body; } catch { /* empty body */ }

  if (!body.bankName?.trim() || !body.accountHolder?.trim() || !body.accountNumber?.trim()) {
    return NextResponse.json({ error: "bankName, accountHolder, and accountNumber are required." }, { status: 400 });
  }

  const db     = createServerClient();
  const userId = session.user.id;

  // If setting as primary, clear existing primary first
  if (body.isPrimary) {
    await db.from("saved_bank_accounts").update({ is_primary: false }).eq("user_id", userId);
  }

  const { data, error } = await db
    .from("saved_bank_accounts")
    .insert({
      user_id:        userId,
      bank_name:      body.bankName.trim(),
      account_holder: body.accountHolder.trim(),
      account_number: body.accountNumber.trim(),
      swift_code:     body.swiftCode?.trim() || null,
      is_primary:     body.isPrimary ?? false,
    })
    .select("id, bank_name, account_holder, account_number, swift_code, is_primary")
    .single();

  if (error) {
    console.error("[withdraw/banks POST]", error.message);
    return NextResponse.json({ error: "Failed to save bank account." }, { status: 500 });
  }

  return NextResponse.json({
    bank: {
      id:            data.id,
      bankName:      data.bank_name,
      accountHolder: data.account_holder,
      accountNumber: data.account_number,
      swiftCode:     data.swift_code ?? undefined,
      isPrimary:     data.is_primary,
    },
  }, { status: 201 });
}
