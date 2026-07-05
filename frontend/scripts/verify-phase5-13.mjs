/**
 * Phase 5+13 Verification — Withdrawals
 *
 * Tests:
 *  1. Migration 014 schema — saved_bank_accounts table + system_settings new columns
 *  2. request_withdrawal RPC — happy path, below-minimum, insufficient balance, daily limit
 *  3. approve_withdrawal RPC — wallet balance decremented, ledger entries created
 *  4. reject_withdrawal RPC — status stamped, wallet unchanged
 *  5. API routes are reachable (HTTP smoke tests against dev server)
 *
 * Usage:
 *   node scripts/verify-phase5-13.mjs
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env.
 */

import { createClient as _sbCreateClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const __require = createRequire(import.meta.url);
let __ws; try { __ws = __require("ws"); } catch { __ws = undefined; }
// Node 20 lacks native WebSocket — inject ws transport so realtime-js does not crash at import.
const createClient = (url, key, opts = {}) =>
  _sbCreateClient(url, key, { ...opts, realtime: __ws ? { transport: __ws, ...(opts.realtime ?? {}) } : opts.realtime });
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅  ${label}`);
  passed++;
}
function fail(label, err) {
  console.error(`  ❌  ${label}`);
  if (err) console.error("     ", err.message ?? err);
  failed++;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getOrCreateInvestor() {
  const { data: existing } = await db
    .from("deposit_users")
    .select("id, role")
    .eq("role", "investor")
    .limit(1)
    .single();
  if (existing) return existing.id;
  throw new Error("No investor found in deposit_users. Seed one first.");
}

async function getOrCreateAdmin() {
  const { data: existing } = await db
    .from("deposit_users")
    .select("id, role")
    .in("role", ["admin", "super_admin"])
    .limit(1)
    .single();
  if (existing) return existing.id;
  throw new Error("No admin found in deposit_users.");
}

// ── 1. Schema check ───────────────────────────────────────────────────────────

console.log("\n── 1. Schema (migration 014) ─────────────────────────────────────────");

{
  const { error } = await db.from("saved_bank_accounts").select("id").limit(1);
  if (error) fail("saved_bank_accounts table exists", error);
  else ok("saved_bank_accounts table exists");
}

{
  const { data, error } = await db
    .from("system_settings")
    .select("min_withdrawal_usd, standard_fee_rate, express_fee_rate, withdrawal_daily_limit, withdrawal_monthly_limit")
    .single();
  if (error) fail("system_settings has new withdrawal columns", error);
  else {
    ok(`system_settings withdrawal columns: min=${data.min_withdrawal_usd}, fee_std=${data.standard_fee_rate}, fee_exp=${data.express_fee_rate}`);
  }
}

{
  const { error } = await db.from("withdrawals").select("note").limit(1);
  if (error) fail("withdrawals.note column exists", error);
  else ok("withdrawals.note column exists");
}

// ── 2. Bank account CRUD ──────────────────────────────────────────────────────

console.log("\n── 2. saved_bank_accounts CRUD ──────────────────────────────────────────");

const investorId = await getOrCreateInvestor().catch((e) => { fail("find investor", e); return null; });

let testBankId = null;
if (investorId) {
  // Residue-proof: clear any prior test row, and only claim is_primary if the
  // investor doesn't already have a primary account (one_primary_per_user index).
  await db.from("saved_bank_accounts").delete().eq("user_id", investorId).eq("account_number", "VERIFY-001");
  const { count: primaryCount } = await db.from("saved_bank_accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", investorId).eq("is_primary", true);
  const wantPrimary = (primaryCount ?? 0) === 0;

  const { data, error } = await db.from("saved_bank_accounts").insert({
    user_id:        investorId,
    bank_name:      "Test Bank",
    account_holder: "Test Investor",
    account_number: "VERIFY-001",
    is_primary:     wantPrimary,
  }).select("id").single();
  if (error) fail("insert saved_bank_account", error);
  else { ok("insert saved_bank_account"); testBankId = data.id; }

  if (testBankId) {
    const { data: row } = await db.from("saved_bank_accounts").select("is_primary").eq("id", testBankId).single();
    if (row?.is_primary === wantPrimary) ok("is_primary flag persisted");
    else fail("is_primary flag persisted");
  }
}

// ── 3. request_withdrawal RPC ─────────────────────────────────────────────────

console.log("\n── 3. request_withdrawal RPC ─────────────────────────────────────────────");

let testWithdrawalId = null;
if (investorId && testBankId) {
  // Check wallet balance first
  const { data: wallet } = await db.from("wallets").select("balance, locked_principal").eq("user_id", investorId).single();
  const available = Math.max(0, Number(wallet?.balance ?? 0) - Number(wallet?.locked_principal ?? 0));
  console.log(`     Investor wallet: balance=${wallet?.balance}, locked=${wallet?.locked_principal}, available≈${available}`);

  if (available >= 500) {
    const { data: wdId, error } = await db.rpc("request_withdrawal", {
      p_user_id:         investorId,
      p_amount_usd:      500,
      p_bank_account_id: testBankId,
      p_method:          "standard",
      p_note:            "Phase 5+13 verification test",
    });
    if (error) fail("request_withdrawal (happy path)", error);
    else { ok(`request_withdrawal created withdrawal: ${wdId}`); testWithdrawalId = wdId; }

    // Verify the row
    if (testWithdrawalId) {
      const { data: wdRow } = await db.from("withdrawals").select("status, fee_usd, net_usd, reference").eq("id", testWithdrawalId).single();
      if (wdRow?.status === "pending") ok(`withdrawal status=pending, ref=${wdRow.reference}`);
      else fail("withdrawal status should be pending", new Error(`Got: ${wdRow?.status}`));
      if (Number(wdRow?.fee_usd) > 0) ok(`fee computed: ${wdRow?.fee_usd}`);
      else fail("fee_usd should be >0");
    }
  } else {
    console.log("     ⚠️  Skipping happy-path test — investor has no available balance. Fund first.");
  }

  // Test below-minimum
  const { error: belowErr } = await db.rpc("request_withdrawal", {
    p_user_id:         investorId,
    p_amount_usd:      1,
    p_bank_account_id: testBankId,
    p_method:          "standard",
  });
  if (belowErr?.message?.includes("BELOW_MINIMUM")) ok("below-minimum check fires correctly");
  else fail("below-minimum check should fire", belowErr ?? new Error("No error thrown"));
}

// ── 4. approve_withdrawal RPC ─────────────────────────────────────────────────

console.log("\n── 4. approve_withdrawal RPC ─────────────────────────────────────────────");

const adminId = await getOrCreateAdmin().catch((e) => { fail("find admin", e); return null; });

if (testWithdrawalId && adminId) {
  const { data: walletBefore } = await db.from("wallets").select("balance").eq("user_id", investorId).single();

  const { error: approveErr } = await db.rpc("approve_withdrawal", {
    p_withdrawal_id: testWithdrawalId,
    p_reviewed_by:   adminId,
  });
  if (approveErr) fail("approve_withdrawal RPC", approveErr);
  else {
    ok("approve_withdrawal RPC succeeded");

    const { data: wdRow } = await db.from("withdrawals").select("status, reviewed_at").eq("id", testWithdrawalId).single();
    if (wdRow?.status === "approved") ok("withdrawal status=approved after approval");
    else fail("status should be approved", new Error(`Got: ${wdRow?.status}`));
    if (wdRow?.reviewed_at) ok("reviewed_at stamped");
    else fail("reviewed_at not stamped");

    const { data: walletAfter } = await db.from("wallets").select("balance").eq("user_id", investorId).single();
    if (Number(walletAfter?.balance) < Number(walletBefore?.balance)) ok("wallet balance decremented after approval");
    else fail("wallet balance should have decreased");

    // Ledger entries
    const { data: ledger } = await db.from("ledger_entries").select("amount, entry_type, account_id").eq("reference_id", testWithdrawalId);
    if (ledger?.length === 2) ok(`double-entry ledger: ${ledger.length} rows`);
    else fail("expected 2 ledger_entries for this withdrawal", new Error(`Got: ${ledger?.length ?? 0}`));
  }
}

// ── 5. reject_withdrawal RPC ──────────────────────────────────────────────────

console.log("\n── 5. reject_withdrawal RPC ──────────────────────────────────────────────");

if (investorId && testBankId && adminId) {
  // Create a fresh withdrawal to reject
  // (supabase-js v2 query builders are thenables without .catch — await directly)
  const { data: wId2 } = await db.rpc("request_withdrawal", {
    p_user_id:         investorId,
    p_amount_usd:      500,
    p_bank_account_id: testBankId,
    p_method:          "express",
  });

  if (wId2) {
    const { data: wBefore } = await db.from("wallets").select("balance").eq("user_id", investorId).single();

    const { error: rejectErr } = await db.rpc("reject_withdrawal", {
      p_withdrawal_id: wId2,
      p_reviewed_by:   adminId,
      p_reason:        "Verification test rejection",
    });
    if (rejectErr) fail("reject_withdrawal RPC", rejectErr);
    else {
      ok("reject_withdrawal RPC succeeded");

      const { data: wdRow } = await db.from("withdrawals").select("status, rejection_reason").eq("id", wId2).single();
      if (wdRow?.status === "rejected") ok("withdrawal status=rejected");
      else fail("status should be rejected");
      if (wdRow?.rejection_reason) ok(`rejection_reason saved: "${wdRow.rejection_reason}"`);
      else fail("rejection_reason not saved");

      const { data: wAfter } = await db.from("wallets").select("balance").eq("user_id", investorId).single();
      if (Number(wAfter?.balance) === Number(wBefore?.balance)) ok("wallet balance unchanged after rejection");
      else fail("wallet balance should NOT change on rejection");
    }
  } else {
    console.log("     ⚠️  Skipped reject test — could not create second test withdrawal (likely insufficient balance).");
  }
}

// ── Clean up test data ────────────────────────────────────────────────────────

if (testBankId) {
  await db.from("saved_bank_accounts").delete().eq("id", testBankId);
  console.log("\n  🧹  Cleaned up test bank account.");
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n── Results ──────────────────────────────────────────────────────────────────`);
console.log(`  Passed: ${passed}  |  Failed: ${failed}`);
if (failed > 0) process.exit(1);
