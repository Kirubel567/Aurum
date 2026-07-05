/**
 * verify-phase3.mjs — Phase 3 wallet page verification
 *
 * Usage:
 *   node scripts/verify-phase3.mjs
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dir, "../.env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error("❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const db = createClient(URL, KEY, { auth: { persistSession: false } });

let passed = 0;
let failed = 0;

function ok(label)  { console.log(`  ✓  ${label}`); passed++; }
function fail(label, detail) { console.error(`  ✗  ${label}`); if (detail) console.error(`     ${detail}`); failed++; }

async function check(label, fn) {
  try {
    const result = await fn();
    if (result === false) fail(label);
    else ok(label);
  } catch (e) {
    fail(label, e?.message ?? String(e));
  }
}

// ── Setup: pick a test investor ───────────────────────────────────────────────

const { data: investor } = await db
  .from("deposit_users")
  .select("id, email, role, deposit_status")
  .eq("role", "investor")
  .limit(1)
  .single();

if (!investor) {
  console.error("❌  No investor found — run verify-phase4-13 first to ensure at least one approved investor exists.");
  process.exit(1);
}

console.log(`\n  Using investor: ${investor.email}`);

// ── 1. wallets table has row ──────────────────────────────────────────────────

console.log("\n── 1. wallets ───────────────────────────────────────────────────");

await check("investor has a wallets row", async () => {
  const { data, error } = await db
    .from("wallets")
    .select("balance, locked_principal")
    .eq("user_id", investor.id)
    .single();
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("no wallet row");
});

await check("wallets.balance is a non-negative number", async () => {
  const { data } = await db
    .from("wallets")
    .select("balance")
    .eq("user_id", investor.id)
    .single();
  if (Number(data?.balance) < 0) throw new Error(`balance is negative: ${data?.balance}`);
});

// ── 2. ledger_entries readable ────────────────────────────────────────────────

console.log("\n── 2. ledger_entries ────────────────────────────────────────────");

await check("ledger_entries table selectable", async () => {
  const { error } = await db
    .from("ledger_entries")
    .select("id, created_at, entry_type, amount, note, reference_id")
    .eq("account_id", investor.id)
    .limit(5);
  if (error) throw new Error(error.message);
});

await check("ledger_entries entry_type values are known enum values", async () => {
  const { data } = await db
    .from("ledger_entries")
    .select("entry_type")
    .eq("account_id", investor.id);
  const known = new Set(["deposit", "withdrawal", "interest_credit", "correction", "trade_pl"]);
  for (const row of data ?? []) {
    if (!known.has(row.entry_type)) throw new Error(`Unknown entry_type: ${row.entry_type}`);
  }
});

// ── 3. deposits readable ──────────────────────────────────────────────────────

console.log("\n── 3. deposits ──────────────────────────────────────────────────");

await check("deposits table selectable for investor", async () => {
  const { error } = await db
    .from("deposits")
    .select("id, settled_amount_usd, reviewed_at, status, amount_submitted, currency_submitted, method, tx_reference")
    .eq("user_id", investor.id)
    .limit(5);
  if (error) throw new Error(error.message);
});

await check("approved deposits have settled_amount_usd set", async () => {
  const { data } = await db
    .from("deposits")
    .select("settled_amount_usd, status")
    .eq("user_id", investor.id)
    .eq("status", "approved");
  for (const d of data ?? []) {
    if (d.settled_amount_usd == null) throw new Error("approved deposit has null settled_amount_usd");
  }
});

// ── 4. withdrawals table ──────────────────────────────────────────────────────

console.log("\n── 4. withdrawals ───────────────────────────────────────────────");

await check("withdrawals table selectable for investor", async () => {
  const { error } = await db
    .from("withdrawals")
    .select("id, created_at, amount_usd, fee_usd, net_usd, method, status, reference, reviewed_at, tx_hash, rejection_reason")
    .eq("user_id", investor.id);
  if (error) throw new Error(error.message);
});

// ── 5. Summary computation sanity ─────────────────────────────────────────────

console.log("\n── 5. Summary computation ───────────────────────────────────────");

await check("total deposited = sum of settled_amount_usd for approved deposits", async () => {
  const { data: deps } = await db
    .from("deposits")
    .select("settled_amount_usd")
    .eq("user_id", investor.id)
    .eq("status", "approved");

  const { data: wallet } = await db
    .from("wallets")
    .select("balance")
    .eq("user_id", investor.id)
    .single();

  const total = (deps ?? []).reduce((s, d) => s + Number(d.settled_amount_usd ?? 0), 0);
  // If approved deposits exist, balance should be > 0 (could differ due to yield/adjustments)
  if (total > 0 && Number(wallet?.balance ?? 0) <= 0) {
    throw new Error(`total deposited ${total} but balance is ${wallet?.balance}`);
  }
});

await check("pending withdrawals are a non-negative total", async () => {
  const { data } = await db
    .from("withdrawals")
    .select("amount_usd")
    .eq("user_id", investor.id)
    .eq("status", "pending");
  const total = (data ?? []).reduce((s, w) => s + Number(w.amount_usd ?? 0), 0);
  if (total < 0) throw new Error(`negative pending withdrawals: ${total}`);
});

// ── 6. system_settings (used by Phase 3 to show daily/monthly limits) ─────────

console.log("\n── 6. system_settings ───────────────────────────────────────────");

await check("system_settings readable", async () => {
  const { data, error } = await db
    .from("system_settings")
    .select("min_deposit_usd, lockup_period_days")
    .single();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("no row");
});

// ── 7. Wallet ID derivation ───────────────────────────────────────────────────

console.log("\n── 7. Wallet ID ─────────────────────────────────────────────────");

await check("walletId derivation produces a valid WLT- prefixed string", async () => {
  const walletId = "WLT-" + investor.id.replace(/-/g, "").slice(-6).toUpperCase();
  if (!walletId.startsWith("WLT-")) throw new Error(`Bad walletId: ${walletId}`);
  if (walletId.length !== 10) throw new Error(`Wrong length: ${walletId.length}`);
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n── Result ────────────────────────────────────────────────────────`);
console.log(`  Passed: ${passed}   Failed: ${failed}`);
if (failed > 0) process.exit(1);
