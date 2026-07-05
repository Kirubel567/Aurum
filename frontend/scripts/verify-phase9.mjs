#!/usr/bin/env node
// verify-phase9.mjs — Phase 9 smoke tests (Profile Settings & Security)
// Run: node scripts/verify-phase9.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
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

console.log("\n── Phase 9: Profile Settings & Security ──\n");

// 1. deposit_users has new profile columns
await test("deposit_users has avatar_path column", async () => {
  const { error } = await db.from("deposit_users").select("avatar_path").limit(1);
  if (error) throw new Error(error.message);
});

await test("deposit_users has address column", async () => {
  const { error } = await db.from("deposit_users").select("address").limit(1);
  if (error) throw new Error(error.message);
});

await test("deposit_users has two_fa_enabled column", async () => {
  const { error } = await db.from("deposit_users").select("two_fa_enabled").limit(1);
  if (error) throw new Error(error.message);
});

await test("deposit_users has two_fa_secret column", async () => {
  const { error } = await db.from("deposit_users").select("two_fa_secret").limit(1);
  if (error) throw new Error(error.message);
});

await test("deposit_users has last_seen_at column", async () => {
  const { error } = await db.from("deposit_users").select("last_seen_at").limit(1);
  if (error) throw new Error(error.message);
});

// 2. kyc_documents table exists with correct schema
await test("kyc_documents table exists", async () => {
  const { error } = await db.from("kyc_documents").select("id").limit(1);
  if (error) throw new Error(error.message);
});

await test("kyc_documents has required columns", async () => {
  const { error } = await db
    .from("kyc_documents")
    .select("id, investor_id, doc_type, storage_path, status, created_at, reviewed_at")
    .limit(1);
  if (error) throw new Error(error.message);
});

await test("kyc_documents rejects invalid doc_type", async () => {
  const { data: user } = await db.from("deposit_users").select("id").eq("role", "investor").limit(1).single();
  if (!user) { console.log("    (skipped — no investor found)"); return; }

  const { error } = await db.from("kyc_documents").insert({
    investor_id: user.id,
    doc_type: "invalid_type",
    storage_path: "test/path",
  });
  if (!error) {
    await db.from("kyc_documents").delete().eq("investor_id", user.id).eq("storage_path", "test/path");
    throw new Error("CHECK constraint did not reject invalid doc_type");
  }
  // Error expected — test passes
});

await test("kyc_documents accepts valid doc_type", async () => {
  const { data: user } = await db.from("deposit_users").select("id").eq("role", "investor").limit(1).single();
  if (!user) { console.log("    (skipped — no investor found)"); return; }

  const { error } = await db.from("kyc_documents").insert({
    investor_id: user.id,
    doc_type: "passport",
    storage_path: "verify-phase9-test/passport.pdf",
    status: "pending",
  });
  if (error) throw new Error(error.message);

  await db.from("kyc_documents")
    .delete()
    .eq("investor_id", user.id)
    .eq("storage_path", "verify-phase9-test/passport.pdf");
});

// 3. active_sessions table exists with correct schema
await test("active_sessions table exists", async () => {
  const { error } = await db.from("active_sessions").select("id").limit(1);
  if (error) throw new Error(error.message);
});

await test("active_sessions has required columns", async () => {
  const { error } = await db
    .from("active_sessions")
    .select("id, user_id, device_label, ip_address, is_current, revoked, created_at, last_active")
    .limit(1);
  if (error) throw new Error(error.message);
});

await test("active_sessions insert and delete", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) throw new Error("No users found to test with");

  const { error } = await db.from("active_sessions").insert({
    user_id: user.id,
    device_label: "Chrome on Windows",
    ip_address: "127.0.0.1",
    is_current: true,
    revoked: false,
  });
  if (error) throw new Error(error.message);

  await db.from("active_sessions")
    .delete()
    .eq("user_id", user.id)
    .eq("device_label", "Chrome on Windows")
    .eq("ip_address", "127.0.0.1");
});

// 4. notifications CHECK includes profile_update
await test("notifications table accepts 'profile_update' type", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) throw new Error("No users found to test with");

  const { error } = await db.from("notifications").insert({
    user_id: user.id,
    type: "profile_update",
    title: "verify-phase9 test",
    body: "test",
  });
  if (error) throw new Error(error.message);

  await db.from("notifications")
    .delete()
    .eq("user_id", user.id)
    .eq("title", "verify-phase9 test");
});

// 5. otplib can generate and verify a TOTP token
await test("otplib TOTP generate + verify cycle", async () => {
  const { generateSecret, generateSync, verifySync } = await import("otplib");
  const secret = generateSecret();
  const token = generateSync({ secret });
  if (!token || token.length !== 6) throw new Error(`generateSync returned invalid token: ${String(token)}`);
  const result = verifySync({ token, secret });
  if (!result.valid) throw new Error("TOTP verification failed");
});

console.log("\n  Note: API route tests require the dev server (npm run dev).");
console.log("  Navigate to /profile to verify real data loads across all three tabs.");
console.log("  Test 2FA enable flow: enable → scan QR / enter secret → verify code → check DB.");
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
