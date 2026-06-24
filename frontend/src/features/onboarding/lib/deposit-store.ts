import { createServerClient } from "@/src/lib/supabase/server";
import type {
  DepositStatus,
  StoredDepositUser,
} from "@/src/features/onboarding/types/deposit.types";

// ── Column mapping helpers ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): StoredDepositUser {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    fullName: row.full_name,
    username: row.username ?? undefined,
    phoneNumber: row.phone_number ?? undefined,
    country: row.country ?? undefined,
    depositStatus: row.deposit_status as DepositStatus,
    emailVerified: row.email_verified,
    emailVerificationToken: row.email_verification_token ?? undefined,
    emailVerificationTokenExpiresAt:
      row.email_verification_token_expires_at ?? undefined,
    intendedDepositAmount: row.intended_deposit_amount ?? undefined,
    proofFileName: row.proof_file_name ?? undefined,
    proofMimeType: row.proof_mime_type ?? undefined,
    proofBase64: row.proof_base64 ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(user: StoredDepositUser): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    full_name: user.fullName,
    username: user.username ?? null,
    phone_number: user.phoneNumber ?? null,
    country: user.country ?? null,
    deposit_status: user.depositStatus,
    email_verified: user.emailVerified,
    email_verification_token: user.emailVerificationToken ?? null,
    email_verification_token_expires_at:
      user.emailVerificationTokenExpiresAt ?? null,
    intended_deposit_amount: user.intendedDepositAmount ?? null,
    proof_file_name: user.proofFileName ?? null,
    proof_mime_type: user.proofMimeType ?? null,
    proof_base64: user.proofBase64 ?? null,
    created_at: user.createdAt,
    updated_at: user.updatedAt,
  };
}

function toPatchRow(patch: Partial<StoredDepositUser>): Record<string, unknown> {
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.email !== undefined) row.email = patch.email;
  if (patch.password !== undefined) row.password = patch.password;
  if (patch.fullName !== undefined) row.full_name = patch.fullName;
  if (patch.username !== undefined) row.username = patch.username;
  if (patch.phoneNumber !== undefined) row.phone_number = patch.phoneNumber;
  if (patch.country !== undefined) row.country = patch.country;
  if (patch.depositStatus !== undefined) row.deposit_status = patch.depositStatus;
  if (patch.emailVerified !== undefined) row.email_verified = patch.emailVerified;
  if (patch.emailVerificationToken !== undefined)
    row.email_verification_token = patch.emailVerificationToken;
  if (patch.emailVerificationTokenExpiresAt !== undefined)
    row.email_verification_token_expires_at = patch.emailVerificationTokenExpiresAt;
  if (patch.intendedDepositAmount !== undefined)
    row.intended_deposit_amount = patch.intendedDepositAmount;
  if (patch.proofFileName !== undefined) row.proof_file_name = patch.proofFileName;
  if (patch.proofMimeType !== undefined) row.proof_mime_type = patch.proofMimeType;
  if (patch.proofBase64 !== undefined) row.proof_base64 = patch.proofBase64;
  return row;
}

// ── Public API (identical signatures to the old file-based store) ─────────────

export async function isDepositStoreReadable(): Promise<boolean> {
  try {
    const db = createServerClient();
    const { error } = await db.from("deposit_users").select("id").limit(1);
    return !error;
  } catch {
    return false;
  }
}

export async function getAllDepositUsers(): Promise<StoredDepositUser[]> {
  const db = createServerClient();
  const { data, error } = await db
    .from("deposit_users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`[deposit-store] getAllDepositUsers: ${error.message}`);
  return (data ?? []).map(fromRow);
}

export async function getDepositUserById(
  id: string
): Promise<StoredDepositUser | null> {
  const db = createServerClient();
  const { data, error } = await db
    .from("deposit_users")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`[deposit-store] getDepositUserById: ${error.message}`);
  return data ? fromRow(data) : null;
}

export async function getDepositUserByEmail(
  email: string
): Promise<StoredDepositUser | null> {
  const db = createServerClient();
  const { data, error } = await db
    .from("deposit_users")
    .select("*")
    .ilike("email", email)
    .maybeSingle();

  if (error) throw new Error(`[deposit-store] getDepositUserByEmail: ${error.message}`);
  return data ? fromRow(data) : null;
}

export async function getDepositUserByVerificationToken(
  token: string
): Promise<StoredDepositUser | null> {
  const db = createServerClient();
  const { data, error } = await db
    .from("deposit_users")
    .select("*")
    .eq("email_verification_token", token)
    .maybeSingle();

  if (error)
    throw new Error(
      `[deposit-store] getDepositUserByVerificationToken: ${error.message}`
    );
  return data ? fromRow(data) : null;
}

export async function createDepositUser(
  user: Omit<
    StoredDepositUser,
    "createdAt" | "updatedAt" | "depositStatus" | "emailVerified"
  > & {
    depositStatus?: DepositStatus;
    emailVerified?: boolean;
  }
): Promise<StoredDepositUser> {
  const db = createServerClient();
  const now = new Date().toISOString();

  const record: StoredDepositUser = {
    ...user,
    emailVerified: user.emailVerified ?? false,
    depositStatus: user.depositStatus ?? "none",
    createdAt: now,
    updatedAt: now,
  };

  const { data, error } = await db
    .from("deposit_users")
    .insert(toInsertRow(record))
    .select()
    .single();

  if (error) throw new Error(`[deposit-store] createDepositUser: ${error.message}`);
  return fromRow(data);
}

export async function updateDepositUser(
  id: string,
  patch: Partial<StoredDepositUser>
): Promise<StoredDepositUser | null> {
  const db = createServerClient();

  const { data, error } = await db
    .from("deposit_users")
    .update(toPatchRow(patch))
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) throw new Error(`[deposit-store] updateDepositUser: ${error.message}`);
  return data ? fromRow(data) : null;
}

export async function updateDepositStatus(
  id: string,
  depositStatus: DepositStatus
): Promise<StoredDepositUser | null> {
  return updateDepositUser(id, { depositStatus });
}
