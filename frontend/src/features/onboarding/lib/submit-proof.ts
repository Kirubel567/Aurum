import { getDepositSessionCookie } from "@/src/features/onboarding/lib/deposit-cookies";
import {
  ALLOWED_PROOF_MIME_TYPES,
  MAX_PROOF_FILE_BYTES,
  validateDepositAmount,
} from "@/src/features/onboarding/lib/deposit-limits";
import {
  sendAdminProofNotificationEmail,
  sendInvestorProofReceivedEmail,
} from "@/src/features/onboarding/lib/email";
import {
  getDepositUserById,
  updateDepositUser,
} from "@/src/features/onboarding/lib/deposit-store";
import { createServerClient } from "@/src/lib/supabase/server";
import { insertNotification } from "@/src/features/notifications/lib/notifications.server";
import type {
  DepositSession,
  SubmitProofResult,
} from "@/src/features/onboarding/types/deposit.types";

const STORAGE_BUCKET = "deposit-proofs";

function generateTxRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `AUR-${ts}-${rand}`;
}

function validateProofPayload(file: File): void {
  if (!ALLOWED_PROOF_MIME_TYPES.has(file.type)) {
    throw new Error("Only PDF, JPG, PNG, or WEBP files are accepted.");
  }
  if (file.size > MAX_PROOF_FILE_BYTES) {
    throw new Error("File size must be under 10 MB.");
  }
}

export async function processDepositProofSubmission(
  file: File,
  sessionOverride?: DepositSession,
  depositAmountRaw?: string
): Promise<SubmitProofResult> {
  const session = sessionOverride ?? (await getDepositSessionCookie());
  if (!session) {
    throw new Error("Unauthorized");
  }

  const amountError = validateDepositAmount(depositAmountRaw ?? "");
  if (amountError) {
    throw new Error(amountError);
  }

  const intendedDepositAmount = Number(depositAmountRaw);

  validateProofPayload(file);

  const user = await getDepositUserById(session.user.id);
  const buffer = Buffer.from(await file.arrayBuffer());
  const proofBase64 = buffer.toString("base64");

  // ── Create the real deposits row (what /admin/deposits reviews) ─────────────
  // Proof goes to Storage; the deposits row is what the admin verification
  // queue lists, counts, and approves through the approve_deposit RPC.
  const db = createServerClient();
  const depositId = crypto.randomUUID();
  const txReference = generateTxRef();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const storagePath = `${session.user.id}/${depositId}.${ext}`;

  const { error: uploadError } = await db.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    console.error("[deposit-proof] Storage upload failed:", uploadError.message);
    throw new Error(
      uploadError.message.toLowerCase().includes("bucket")
        ? "Deposit proof storage is not yet configured. Please contact support."
        : "Failed to upload proof document. Please try again."
    );
  }

  const { error: insertError } = await db.from("deposits").insert({
    id:                 depositId,
    user_id:            session.user.id,
    amount_submitted:   intendedDepositAmount,
    currency_submitted: "USD",
    method:             "bank",
    method_detail:      "Onboarding wire transfer",
    proof_file_path:    storagePath,
    tx_reference:       txReference,
    status:             "pending",
    metadata:           { source: "onboarding" },
  });

  if (insertError) {
    await db.storage.from(STORAGE_BUCKET).remove([storagePath]);
    console.error("[deposit-proof] deposits insert failed:", insertError.message);
    throw new Error("Failed to record your deposit. Please try again.");
  }

  // ── Legacy deposit_users fields (DepositGate reads deposit_status) ──────────
  if (user) {
    const updated = await updateDepositUser(user.id, {
      depositStatus: "pending",
      intendedDepositAmount,
      proofFileName: file.name,
      proofMimeType: file.type,
      proofBase64,
    });

    if (!updated) {
      console.warn(
        "[deposit-proof] Store update failed after deposit insert for user",
        session.user.id
      );
    }
  } else {
    console.warn(
      "[deposit-proof] User record missing in store; deposits row created",
      session.user.id
    );
  }

  // ── Notifications + emails: best-effort, never fail the submission ──────────
  const results = await Promise.allSettled([
    // Bell notification for every staff member — this is the first-deposit
    // flow, so the admin portal must light up the moment a proof lands.
    (async () => {
      const { data: staff } = await db
        .from("deposit_users")
        .select("id")
        .in("role", ["admin", "super_admin"]);
      await Promise.allSettled(
        (staff ?? []).map((s) =>
          insertNotification({
            userId:   s.id as string,
            type:     "deposit_status",
            title:    "New deposit proof submitted",
            body:     `${session.user.name} submitted an onboarding deposit proof of $${intendedDepositAmount.toLocaleString()} (ref: ${txReference}).`,
            linkPath: "/admin/deposits",
          })
        )
      );
    })(),
    sendInvestorProofReceivedEmail(session.user.email, session.user.name),
    sendAdminProofNotificationEmail({
      investorEmail: session.user.email,
      investorName: session.user.name,
      username: user?.username ?? session.user.email,
      phoneNumber: user?.phoneNumber ?? "Not on record",
      country: user?.country ?? "Not on record",
      intendedDepositAmount,
      proofFileName: file.name,
      proofBase64,
      proofMimeType: file.type,
      investorId: session.user.id,
    }),
  ]);
  for (const r of results) {
    if (r.status === "rejected") {
      console.error("[deposit-proof] email dispatch failed:", r.reason);
    }
  }

  return { depositStatus: "pending" };
}
