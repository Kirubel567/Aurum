import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  const db = createServerClient();

  // Confirm it belongs to this investor before deleting
  const { data: existing } = await db
    .from("saved_bank_accounts")
    .select("id, user_id")
    .eq("id", id)
    .single();

  if (!existing || existing.user_id !== session.user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await db
    .from("saved_bank_accounts")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[withdraw/banks DELETE]", error.message);
    return NextResponse.json({ error: "Failed to delete bank account." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getDepositSessionCookie();
  if (!session || session.user.role !== "investor") {
    return NextResponse.json({ error: "Forbidden" }, { status: 401 });
  }

  let body: { isPrimary?: boolean } = {};
  try { body = await request.json() as typeof body; } catch { /* empty */ }

  const db     = createServerClient();
  const userId = session.user.id;

  // Confirm ownership
  const { data: existing } = await db
    .from("saved_bank_accounts").select("id, user_id").eq("id", id).single();
  if (!existing || existing.user_id !== userId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (body.isPrimary) {
    // Clear existing primary then set this one
    await db.from("saved_bank_accounts").update({ is_primary: false }).eq("user_id", userId);
  }

  const { error } = await db
    .from("saved_bank_accounts")
    .update({ is_primary: body.isPrimary ?? false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  return NextResponse.json({ success: true });
}
