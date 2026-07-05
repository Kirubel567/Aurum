import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";

const STORAGE_BUCKET = "deposit-proofs";
const SIGNED_URL_EXPIRY_SECONDS = 3600; // 1 hour

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

  const { data: row, error } = await db
    .from("deposits")
    .select(`
      *,
      deposit_users!deposits_user_id_fkey (
        full_name,
        email,
        username,
        phone_number,
        country
      ),
      reviewer:deposit_users!deposits_reviewed_by_fkey (
        full_name
      )
    `)
    .eq("id", id)
    .single();

  if (error || !row) {
    return NextResponse.json({ error: "Deposit not found." }, { status: 404 });
  }

  // Generate signed URL for the proof document (only for non-legacy deposits with a file)
  let proofUrl: string | null = null;
  if (row.proof_file_path) {
    const { data: signed, error: signedErr } = await db.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(row.proof_file_path, SIGNED_URL_EXPIRY_SECONDS);
    if (!signedErr && signed) {
      proofUrl = signed.signedUrl;
    }
  }

  const investor = row.deposit_users as {
    full_name?: string; email?: string; username?: string;
    phone_number?: string; country?: string;
  } | null;
  const reviewer = row.reviewer as { full_name?: string } | null;

  return NextResponse.json({
    deposit: {
      id:                  row.id,
      userId:              row.user_id,
      investorName:        investor?.full_name ?? "Unknown",
      investorEmail:       investor?.email ?? "",
      investorUsername:    investor?.username ?? null,
      investorPhone:       investor?.phone_number ?? null,
      investorCountry:     investor?.country ?? null,
      amountSubmitted:     Number(row.amount_submitted),
      currencySubmitted:   row.currency_submitted,
      fxRateApplied:       row.fx_rate_applied != null ? Number(row.fx_rate_applied) : null,
      settledAmountUsd:    row.settled_amount_usd != null ? Number(row.settled_amount_usd) : null,
      method:              row.method,
      methodDetail:        row.method_detail,
      txReference:         row.tx_reference,
      txHash:              row.tx_hash ?? null,
      status:              row.status,
      rejectionReason:     row.rejection_reason ?? null,
      reviewedBy:          reviewer?.full_name ?? null,
      reviewedAt:          row.reviewed_at ?? null,
      createdAt:           row.created_at,
      proofUrl,
      isLegacy:            !row.proof_file_path,
      metadata:            row.metadata ?? null,
    },
  });
}
