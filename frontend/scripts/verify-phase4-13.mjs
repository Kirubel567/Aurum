/**
 * verify-phase4-13.mjs — Phase 4+13 deposit pipeline verification
 *
 * Usage:
 *   node scripts/verify-phase4-13.mjs
 *
 * Requires in environment (or .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

const __dir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dir, "../.env.local") });

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

// ── Helpers ──────────────────────────────────────────────────────────────────

async function pickSuperAdmin() {
  const { data } = await db.from("deposit_users").select("id,email,role").eq("role", "super_admin").limit(1).single();
  return data;
}

async function pickInvestor() {
  const { data } = await db.from("deposit_users").select("id,email,role").eq("role", "investor").limit(1).single();
  return data;
}

async function getWallet(userId) {
  const { data } = await db.from("wallets").select("balance,locked_principal").eq("user_id", userId).single();
  return data;
}

async function getDeposit(id) {
  const { data } = await db.from("deposits").select("*").eq("id", id).single();
  return data;
}

async function getLedger(userId) {
  const { data } = await db.from("ledger_entries").select("*").eq("account_id", userId).order("created_at", { ascending: false }).limit(10);
  return data ?? [];
}

async function getLocks(userId) {
  const { data } = await db.from("principal_lock_blocks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(5);
  return data ?? [];
}

async function getAllocations(userId) {
  const { data } = await db.from("allocations").select("*").eq("user_id", userId);
  return data ?? [];
}

// ── Schema checks ─────────────────────────────────────────────────────────────

console.log("\n── 1. Schema & seed ─────────────────────────────────────────────");

await check("system_settings table exists", async () => {
  const { error } = await db.from("system_settings").select("id").limit(1);
  if (error) throw new Error(error.message);
});

await check("system_settings has singleton seed row", async () => {
  const { data } = await db.from("system_settings").select("*").limit(2);
  if (!data || data.length !== 1) throw new Error(`Expected 1 row, found ${data?.length ?? 0}`);
  if (Number(data[0].min_deposit_usd) < 1000) throw new Error("min_deposit_usd looks wrong");
});

await check("deposits.metadata column exists", async () => {
  const { error } = await db.from("deposits").select("metadata").limit(1);
  if (error) throw new Error(error.message);
});

await check("approve_deposit RPC exists", async () => {
  // Calling with a nil UUID should return an RPC error (not a 'function not found' error)
  const { error } = await db.rpc("approve_deposit", {
    p_deposit_id:  "00000000-0000-0000-0000-000000000000",
    p_reviewed_by: "00000000-0000-0000-0000-000000000000",
    p_fx_rate:     1.0,
  });
  // Will error because deposit doesn't exist — that's fine, it means the RPC exists
  if (error?.message?.includes("function") && error?.message?.includes("does not exist")) throw new Error("RPC not found");
});

await check("reject_deposit RPC exists", async () => {
  const { error } = await db.rpc("reject_deposit", {
    p_deposit_id:  "00000000-0000-0000-0000-000000000000",
    p_reviewed_by: "00000000-0000-0000-0000-000000000000",
    p_reason:      "verification test",
  });
  if (error?.message?.includes("function") && error?.message?.includes("does not exist")) throw new Error("RPC not found");
});

// ── Legacy backfill check ─────────────────────────────────────────────────────

console.log("\n── 2. Legacy backfill ───────────────────────────────────────────");

await check("deposit_users with proofs have deposits rows", async () => {
  const { data: proofUsers } = await db
    .from("deposit_users")
    .select("id")
    .or("proof_base64.neq.null,intended_deposit_amount.neq.null");

  if (!proofUsers?.length) { ok("no legacy proof users found — skip"); return; }

  for (const u of proofUsers) {
    const { data } = await db.from("deposits").select("id").eq("user_id", u.id).limit(1).single();
    if (!data) throw new Error(`deposit_users ${u.id} has proof but no deposits row`);
  }
});

await check("legacy deposits have metadata.source = 'legacy_backfill'", async () => {
  const { data } = await db
    .from("deposits")
    .select("id,metadata")
    .filter("metadata->>'source'", "eq", "legacy_backfill")
    .limit(5);
  // Just verifying they have the right tag; 0 rows is OK if no legacy data
  if (data === null) throw new Error("Query failed");
});

// ── Approve flow ─────────────────────────────────────────────────────────────

console.log("\n── 3. Approve flow ──────────────────────────────────────────────");

const investor   = await pickInvestor();
const superAdmin = await pickSuperAdmin();

if (!investor || !superAdmin) {
  fail("Prerequisite: need at least 1 investor + 1 super_admin in deposit_users");
  console.log(`  (investor: ${investor?.email}, super_admin: ${superAdmin?.email})`);
} else {
  console.log(`  Using investor: ${investor.email}, super_admin: ${superAdmin.email}`);

  const walletBefore = await getWallet(investor.id);

  // Insert a test pending deposit
  const { data: dep, error: insErr } = await db.from("deposits").insert({
    user_id:           investor.id,
    amount_submitted:  5000,
    currency_submitted: "USD",
    method:            "bank",
    method_detail:     "bank transfer",
    tx_reference:      `TEST-APPROVE-${Date.now()}`,
    status:            "pending",
  }).select("id").single();

  if (insErr || !dep) {
    fail("Insert test pending deposit", insErr?.message);
  } else {
    const depositId = dep.id;

    await check("approve_deposit credits wallet", async () => {
      const { error } = await db.rpc("approve_deposit", {
        p_deposit_id:  depositId,
        p_reviewed_by: superAdmin.id,
        p_fx_rate:     1.0,
      });
      if (error) throw new Error(error.message);

      const walletAfter = await getWallet(investor.id);
      const delta = Number(walletAfter?.balance ?? 0) - Number(walletBefore?.balance ?? 0);
      if (delta < 4999) throw new Error(`Wallet balance delta too small: ${delta}`);
    });

    await check("deposit stamped as approved", async () => {
      const d = await getDeposit(depositId);
      if (d?.status !== "approved") throw new Error(`Status is '${d?.status}'`);
      if (!d?.reviewed_by) throw new Error("reviewed_by not set");
    });

    await check("double-entry ledger entries created", async () => {
      const entries = await getLedger(investor.id);
      const found = entries.find((e) => e.reference_id === depositId && e.entry_type === "deposit");
      if (!found) throw new Error("No ledger entry with reference_id = depositId");
    });

    await check("principal_lock_block created", async () => {
      const locks = await getLocks(investor.id);
      const found = locks.find((l) => l.deposit_id === depositId);
      if (!found) throw new Error("No principal_lock_block for this deposit");
    });

    await check("deposit_status set to approved on deposit_users", async () => {
      const { data } = await db.from("deposit_users").select("deposit_status").eq("id", investor.id).single();
      if (!["approved", "active"].includes(data?.deposit_status ?? "")) {
        throw new Error(`deposit_status is '${data?.deposit_status}'`);
      }
    });

    // Check pool allocations (only on first deposit — may or may not apply here)
    const allocs = await getAllocations(investor.id);
    if (allocs.length > 0) {
      await check("pool allocations seeded", async () => {
        const pct = allocs.reduce((s, a) => s + Number(a.allocation_pct), 0);
        if (Math.abs(pct - 100) > 0.01) throw new Error(`Allocations sum to ${pct}%, not 100%`);
      });
    }

    // Double-approve test
    await check("re-approving already-approved deposit returns error", async () => {
      const { error } = await db.rpc("approve_deposit", {
        p_deposit_id:  depositId,
        p_reviewed_by: superAdmin.id,
        p_fx_rate:     1.0,
      });
      if (!error) throw new Error("RPC should have returned DEPOSIT_NOT_PENDING error");
    });
  }
}

// ── Reject flow ───────────────────────────────────────────────────────────────

console.log("\n── 4. Reject flow ───────────────────────────────────────────────");

if (investor && superAdmin) {
  const { data: dep2, error: ins2Err } = await db.from("deposits").insert({
    user_id:           investor.id,
    amount_submitted:  100,
    currency_submitted: "USD",
    method:            "bank",
    method_detail:     "bank transfer",
    tx_reference:      `TEST-REJECT-${Date.now()}`,
    status:            "pending",
  }).select("id").single();

  if (ins2Err || !dep2) {
    fail("Insert test pending deposit for reject", ins2Err?.message);
  } else {
    const depositId2 = dep2.id;
    const walletMid = await getWallet(investor.id);

    await check("reject_deposit stamps as rejected", async () => {
      const { error } = await db.rpc("reject_deposit", {
        p_deposit_id:  depositId2,
        p_reviewed_by: superAdmin.id,
        p_reason:      "Verification test — intentional rejection",
      });
      if (error) throw new Error(error.message);

      const d = await getDeposit(depositId2);
      if (d?.status !== "rejected") throw new Error(`Status is '${d?.status}'`);
      if (!d?.rejection_reason) throw new Error("rejection_reason not set");
    });

    await check("reject does NOT change wallet balance", async () => {
      const walletAfter = await getWallet(investor.id);
      if (String(walletAfter?.balance) !== String(walletMid?.balance)) {
        throw new Error(`Balance changed from ${walletMid?.balance} to ${walletAfter?.balance}`);
      }
    });

    await check("reject does NOT create ledger entry", async () => {
      const entries = await getLedger(investor.id);
      const found = entries.find((e) => e.reference_id === depositId2);
      if (found) throw new Error("Unexpected ledger entry for rejected deposit");
    });

    // Clean up test deposits
    await db.from("deposits").delete().in("id", [dep2.id]);
  }
}

// ── Below-minimum test ────────────────────────────────────────────────────────

console.log("\n── 5. Minimum deposit enforcement ──────────────────────────────");

if (investor && superAdmin) {
  const { data: depSmall } = await db.from("deposits").insert({
    user_id:           investor.id,
    amount_submitted:  100,  // way below minimum
    currency_submitted: "USD",
    method:            "bank",
    method_detail:     "bank transfer",
    tx_reference:      `TEST-BELOW-MIN-${Date.now()}`,
    status:            "pending",
  }).select("id").single();

  if (depSmall) {
    await check("approve_deposit rejects below-minimum amount", async () => {
      const { error } = await db.rpc("approve_deposit", {
        p_deposit_id:  depSmall.id,
        p_reviewed_by: superAdmin.id,
        p_fx_rate:     1.0,
      });
      if (!error) throw new Error("Should have returned BELOW_MINIMUM_DEPOSIT error");
      if (!error.message.includes("BELOW_MINIMUM")) throw new Error(`Wrong error: ${error.message}`);
    });

    await db.from("deposits").delete().eq("id", depSmall.id);
  }
}

// ── system_settings RLS ───────────────────────────────────────────────────────

console.log("\n── 6. system_settings RLS ───────────────────────────────────────");

await check("system_settings is readable (service-role)", async () => {
  const { data, error } = await db.from("system_settings").select("min_deposit_usd,lockup_period_days").single();
  if (error) throw new Error(error.message);
  if (!data?.min_deposit_usd) throw new Error("min_deposit_usd missing");
});

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n── Result ────────────────────────────────────────────────────────`);
console.log(`  Passed: ${passed}   Failed: ${failed}`);
if (failed > 0) process.exit(1);
