import { NextResponse } from "next/server";

import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import { createServerClient } from "@/src/lib/supabase/server";
import { ALLOWED_PROOF_MIME_TYPES, MAX_PROOF_FILE_BYTES } from "@/src/features/onboarding/lib/deposit-limits";
import { sendInvestorProofReceivedEmail } from "@/src/features/onboarding/lib/email";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";

export const runtime = "nodejs";
export const maxDuration = 60;

const STORAGE_BUCKET = "deposit-proofs";

function generateTxRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AUR-${ts}-${rand}`;
}

export async function POST(request: Request) {
  const session = await getDepositSessionCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PROOF_FILE_BYTES + 512_000) {
    return NextResponse.json({ error: "File size must be under 10 MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const proof = formData.get("proof");
  if (!(proof instanceof File)) {
    return NextResponse.json({ error: "A valid proof document is required." }, { status: 400 });
  }

  // Server-side file validation (never trust client validation alone)
  if (!ALLOWED_PROOF_MIME_TYPES.has(proof.type)) {
    return NextResponse.json({ error: "Only PDF, JPG, PNG, or WEBP files are accepted." }, { status: 400 });
  }
  if (proof.size > MAX_PROOF_FILE_BYTES) {
    return NextResponse.json({ error: "File size must be under 10 MB." }, { status: 413 });
  }

  const depositAmountRaw = formData.get("depositAmount")?.toString() ?? "";
  const amount = Number(depositAmountRaw);
  if (!depositAmountRaw || Number.isNaN(amount) || amount < 1) {
    return NextResponse.json({ error: "Please enter a valid deposit amount." }, { status: 400 });
  }

  const currency     = (formData.get("currency")?.toString()      ?? "USD").toUpperCase();
  const method       = (formData.get("method")?.toString()        ?? "other").toLowerCase();
  const methodDetail = formData.get("methodDetail")?.toString()   ?? "";
  const paymentSource = formData.get("paymentSource")?.toString() ?? "own";

  if (!["bank", "ewallet", "crypto", "other"].includes(method)) {
    return NextResponse.json({ error: "Invalid payment method." }, { status: 400 });
  }

  const db = createServerClient();
  const txReference = generateTxRef();
  const depositId = crypto.randomUUID();

  // ── Upload proof to Supabase Storage ────────────────────────────────────
  const ext = proof.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${session.user.id}/${depositId}.${ext}`;
  const fileBuffer = Buffer.from(await proof.arrayBuffer());

  const { error: uploadError } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, fileBuffer, {
      contentType: proof.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("[funding/upload] Storage upload failed:", uploadError.message);
    if (uploadError.message.includes("Bucket not found") || uploadError.message.includes("bucket")) {
      return NextResponse.json(
        { error: "Deposit proof storage is not yet configured. Please contact support." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Failed to upload proof document. Please try again." }, { status: 500 });
  }

  // ── Insert deposits row ───────────────────────────────────────────────────
  const metadata: Record<string, string> = { paymentSource };

  const { error: insertError } = await db.from("deposits").insert({
    id:                depositId,
    user_id:           session.user.id,
    amount_submitted:  amount,
    currency_submitted: currency,
    method,
    method_detail:     methodDetail || method,
    proof_file_path:   storagePath,
    tx_reference:      txReference,
    status:            "pending",
    metadata,
  });

  if (insertError) {
    // Clean up the uploaded file so we don't leave orphaned objects
    await db.storage.from(STORAGE_BUCKET).remove([storagePath]);
    console.error("[funding/upload] Insert failed:", insertError.message);
    return NextResponse.json({ error: "Failed to record deposit. Please try again." }, { status: 500 });
  }

  // ── Non-critical side-effects (fire & forget, don't fail the request) ───
  const investorEmail = session.user.email;
  const investorName  = session.user.name;

  await Promise.allSettled([
    sendInvestorProofReceivedEmail(investorEmail, investorName),

    // Notify investor
    insertNotification({
      userId:   session.user.id,
      type:     "deposit_status",
      title:    "Deposit proof submitted",
      body:     `Your deposit proof (ref: ${txReference}) has been received and is under review. We'll notify you once it's processed.`,
      linkPath: "/wallet",
    }),

    // Notify all staff
    (async () => {
      const { data: staff } = await db
        .from("deposit_users")
        .select("id")
        .in("role", ["admin", "super_admin"]);
      await Promise.allSettled(
        (staff ?? []).map((s) =>
          insertNotification({
            userId:   s.id,
            type:     "deposit_status",
            title:    "New deposit proof submitted",
            body:     `${investorName} submitted a deposit proof of ${amount} ${currency} (ref: ${txReference}).`,
            linkPath: "/admin/deposits",
          })
        )
      );
    })(),
  ]);

  return NextResponse.json({ txReference, depositStatus: "pending" }, { status: 201 });
}
