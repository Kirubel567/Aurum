#!/usr/bin/env node
// verify-phase6-15.mjs — Phase 6+15 smoke tests
// Run: node scripts/verify-phase6-15.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// Node 20 needs ws passed as the Realtime transport (no native WebSocket).
let ws;
try { ws = require("ws"); } catch { ws = undefined; }

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) { console.error("Missing env vars"); process.exit(1); }

const realtimeOpts = ws ? { transport: ws } : {};
const db = createClient(URL_, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: realtimeOpts,
});

let passed = 0; let failed = 0;

async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log("\n── Phase 6+15: Messaging ──\n");

// 1. messages table exists and is queryable
await test("messages table exists", async () => {
  const { error } = await db.from("messages").select("id").limit(1);
  if (error) throw new Error(error.message);
});

// 2. messages table has required columns
await test("messages table has all required columns", async () => {
  const { data, error } = await db
    .from("messages")
    .select("id, investor_id, investor_name, sender_role, body, read_by_investor, read_by_admin, created_at")
    .limit(1);
  if (error) throw new Error(error.message);
  // If no rows exist that's fine — the select itself validates the columns
  void data;
});

// 3. Notifications table accepts message type
await test("notifications table accepts 'message' type", async () => {
  // Find any user to target
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) throw new Error("No users found to test with");

  const { error } = await db.from("notifications").insert({
    user_id: user.id,
    type: "message",
    title: "verify-phase6-15 test notification",
    body: "test",
    link_path: "/concierge",
  });
  if (error) throw new Error(error.message);

  // Clean up
  await db.from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("title", "verify-phase6-15 test notification");
});

// 4. Notifications table accepts new_withdrawal type (was missing from CHECK before migration 016)
await test("notifications table accepts 'new_withdrawal' type", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) throw new Error("No users found to test with");

  const { error } = await db.from("notifications").insert({
    user_id: user.id,
    type: "new_withdrawal",
    title: "verify-phase6-15 test new_withdrawal",
    body: "test",
  });
  if (error) throw new Error(error.message);

  await db.from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("title", "verify-phase6-15 test new_withdrawal");
});

// 5. account_manager_assignments table exists (needed by concierge/manager route)
await test("account_manager_assignments table exists", async () => {
  const { error } = await db.from("account_manager_assignments").select("investor_id").limit(1);
  if (error) throw new Error(error.message);
});

// 6. Messages can be inserted (sender_role constraint)
await test("messages table rejects invalid sender_role", async () => {
  const { data: investor } = await db
    .from("deposit_users").select("id").eq("role", "investor").limit(1).single();
  if (!investor) { console.log("    (skipped — no investor found)"); return; }

  const { error } = await db.from("messages").insert({
    investor_id: investor.id,
    investor_name: "Test",
    sender_role: "hacker",
    body: "should be rejected",
  });
  if (!error) {
    // Clean up the bad row and fail
    await db.from("messages").delete().eq("investor_id", investor.id).eq("body", "should be rejected");
    throw new Error("CHECK constraint did not reject invalid sender_role");
  }
  // Error is expected — test passes
});

// 7. Messages can be inserted with valid sender_role
await test("messages table accepts valid message insert", async () => {
  const { data: investor } = await db
    .from("deposit_users").select("id, full_name").eq("role", "investor").limit(1).single();
  if (!investor) { console.log("    (skipped — no investor found)"); return; }

  const { error } = await db.from("messages").insert({
    investor_id: investor.id,
    investor_name: investor.full_name ?? "Test Investor",
    sender_role: "admin",
    body: "verify-phase6-15 test message",
    read_by_investor: false,
    read_by_admin: true,
  });
  if (error) throw new Error(error.message);

  // Clean up
  await db.from("messages")
    .delete()
    .eq("investor_id", investor.id)
    .eq("body", "verify-phase6-15 test message");
});

console.log("\n  Note: API route tests require the dev server (npm run dev).");
console.log("  Navigate to /concierge (investor) and /admin/inbox to verify real data loads.");
console.log("  Check that sending a message creates a notification for the recipient.");
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
