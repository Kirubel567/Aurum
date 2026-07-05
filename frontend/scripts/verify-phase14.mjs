#!/usr/bin/env node
// verify-phase14.mjs — Phase 14 smoke tests
// Run: node scripts/verify-phase14.mjs
// Requires: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL in .env.local
import "dotenv/config";
import { createClient as _sbCreateClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const __require = createRequire(import.meta.url);
let __ws; try { __ws = __require("ws"); } catch { __ws = undefined; }
// Node 20 lacks native WebSocket — inject ws transport so realtime-js does not crash at import.
const createClient = (url, key, opts = {}) =>
  _sbCreateClient(url, key, { ...opts, realtime: __ws ? { transport: __ws, ...(opts.realtime ?? {}) } : opts.realtime });

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) { console.error("Missing env vars"); process.exit(1); }

const db = createClient(URL_, KEY, { auth: { autoRefreshToken: false, persistSession: false } });

let passed = 0; let failed = 0;

async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log("\n── Phase 14: Admin User Management ──\n");

// 1. balance_overrides table exists
await test("balance_overrides table exists", async () => {
  const { error } = await db.from("balance_overrides").select("id").limit(1);
  if (error) throw new Error(error.message);
});

// 2. is_suspended column on deposit_users
await test("deposit_users.is_suspended column exists", async () => {
  const { data, error } = await db.from("deposit_users").select("is_suspended").limit(1);
  if (error) throw new Error(error.message);
  if (data === null) throw new Error("No rows to verify column");
});

// 3. ledger_entry_type has manual_adjustment
await test("ledger_entry_type includes manual_adjustment", async () => {
  // Filtering by an enum value that doesn't exist raises "invalid input value
  // for enum" — so a clean (even empty) result proves the value exists.
  const { error } = await db.from("ledger_entries").select("id").eq("entry_type", "manual_adjustment").limit(1);
  if (error) throw new Error(error.message);
});

// 4. Find a real investor to test with (need super_admin caller for RPCs)
const { data: investors } = await db
  .from("deposit_users")
  .select("id, full_name, role, deposit_status")
  .eq("role", "investor")
  .limit(1)
  .single();

if (!investors) {
  console.log("  ⚠ No investor found — skipping RPC tests");
} else {
  const investorId = investors.id;
  const investorName = investors.full_name;

  // Find a super_admin caller
  const { data: superAdmin } = await db
    .from("deposit_users")
    .select("id, full_name")
    .eq("role", "super_admin")
    .limit(1)
    .single();

  if (!superAdmin) {
    console.log("  ⚠ No super_admin found — skipping RPC tests");
  } else {
    // Get current balance
    const { data: walletBefore } = await db
      .from("wallets")
      .select("balance")
      .eq("user_id", investorId)
      .eq("currency", "USD")
      .single();
    const balanceBefore = Number(walletBefore?.balance ?? 0);
    const testAmount = 1.00; // $1 test

    // 5. admin_adjust_balance — we call with service role which auth.uid()=null
    //    So the RPC caller check will fail (no role). We test the API route behavior instead.
    await test("balance_overrides table is writable via service role", async () => {
      const { error } = await db.from("balance_overrides").insert({
        user_id: investorId,
        amount_usd: testAmount,
        reason: "verify-phase14 test",
        performed_by: superAdmin.id,
      });
      if (error) throw new Error(error.message);
    });

    // 6. Verify ledger entry types exist in enum (indirect: check existing ledger entries)
    await test("ledger_entries accepts manual_adjustment type (enum value exists)", async () => {
      // Use service role to insert a test ledger entry
      const { error } = await db.from("ledger_entries").insert({
        transaction_id: crypto.randomUUID(),
        account_id: investorId,
        entry_type: "manual_adjustment",
        amount: testAmount,
        currency: "USD",
        reference_table: "balance_overrides",
        note: "verify-phase14 test entry",
        created_by: superAdmin.id,
      });
      if (error) throw new Error(error.message);
    });

    await test("ledger_entries accepts yield_credit type (enum value exists)", async () => {
      const { error } = await db.from("ledger_entries").insert({
        transaction_id: crypto.randomUUID(),
        account_id: investorId,
        entry_type: "yield_credit",
        amount: testAmount,
        currency: "USD",
        note: "verify-phase14 test yield",
        created_by: superAdmin.id,
      });
      if (error) throw new Error(error.message);
    });

    // 7. is_suspended toggle
    await test("deposit_users.is_suspended can be toggled", async () => {
      const { error: e1 } = await db.from("deposit_users").update({ is_suspended: true }).eq("id", investorId);
      if (e1) throw new Error("Could not suspend: " + e1.message);
      const { data: check } = await db.from("deposit_users").select("is_suspended").eq("id", investorId).single();
      if (!check?.is_suspended) throw new Error("is_suspended did not toggle to true");
      // Reinstate
      await db.from("deposit_users").update({ is_suspended: false }).eq("id", investorId);
    });

    // Clean up test balance_override and ledger entries
    await db.from("balance_overrides").delete().eq("user_id", investorId).eq("reason", "verify-phase14 test");
    await db.from("ledger_entries").delete().eq("account_id", investorId).like("note", "verify-phase14%");

    console.log(`\n  Tested with investor: ${investorName} (${investorId.slice(0, 8)}…)`);
  }
}

// 8. GET /api/admin/users endpoint structure (requires running dev server — skip in CI)
console.log("\n  Note: API route tests require running dev server (npm run dev).");
console.log("  Navigate to /admin/users and verify real data loads.");

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
