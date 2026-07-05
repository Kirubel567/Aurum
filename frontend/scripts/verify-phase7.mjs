#!/usr/bin/env node
// verify-phase7.mjs — Phase 7 smoke tests (AI Support Chat)
// Run: node --require dotenv/config scripts/verify-phase7.mjs dotenv_config_path=.env.local
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

console.log("\n── Phase 7: AI Support Chat ──\n");

// 1. ai_chat_sessions table exists
await test("ai_chat_sessions table exists", async () => {
  const { error } = await db.from("ai_chat_sessions").select("id").limit(1);
  if (error) throw new Error(error.message);
});

// 2. ai_chat_sessions has required columns
await test("ai_chat_sessions has required columns", async () => {
  const { error } = await db
    .from("ai_chat_sessions")
    .select("id, user_id, created_at")
    .limit(1);
  if (error) throw new Error(error.message);
});

// 3. ai_chat_messages table exists
await test("ai_chat_messages table exists", async () => {
  const { error } = await db.from("ai_chat_messages").select("id").limit(1);
  if (error) throw new Error(error.message);
});

// 4. ai_chat_messages has required columns
await test("ai_chat_messages has required columns", async () => {
  const { error } = await db
    .from("ai_chat_messages")
    .select("id, session_id, role, body, created_at")
    .limit(1);
  if (error) throw new Error(error.message);
});

// 5. ai_chat_messages rejects invalid role
await test("ai_chat_messages rejects invalid role", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) { console.log("    (skipped — no users found)"); return; }

  // Create a session first
  const { data: session } = await db
    .from("ai_chat_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (!session) throw new Error("Could not create test session");

  const { error } = await db.from("ai_chat_messages").insert({
    session_id: session.id,
    role: "hacker",
    body: "should be rejected",
  });

  // Clean up session regardless
  await db.from("ai_chat_sessions").delete().eq("id", session.id);

  if (!error) throw new Error("CHECK constraint did not reject invalid role");
});

// 6. Full insert/delete cycle
await test("ai_chat_sessions and messages insert/delete cycle", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) { console.log("    (skipped — no users found)"); return; }

  const { data: session, error: sessionErr } = await db
    .from("ai_chat_sessions")
    .insert({ user_id: user.id })
    .select("id")
    .single();
  if (sessionErr) throw new Error(sessionErr.message);

  const { error: msgErr } = await db.from("ai_chat_messages").insert([
    { session_id: session.id, role: "user", body: "verify-phase7 test user message" },
    { session_id: session.id, role: "assistant", body: "verify-phase7 test AI reply" },
  ]);
  if (msgErr) {
    await db.from("ai_chat_sessions").delete().eq("id", session.id);
    throw new Error(msgErr.message);
  }

  // Cascade delete cleans up messages too
  await db.from("ai_chat_sessions").delete().eq("id", session.id);
});

// 7. Gemini API key is configured
await test("GEMINI_API_KEY is set in environment", async () => {
  // This script runs in Node, not the Next.js runtime — just check the .env.local
  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY not found in .env.local — add it to enable AI responses"
    );
  }
});

// 8. @google/generative-ai package is importable
await test("@google/generative-ai package is installed", async () => {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  if (!GoogleGenerativeAI) throw new Error("GoogleGenerativeAI not found");
});

console.log("\n  Note: Live AI response test requires the dev server (npm run dev).");
console.log("  Navigate to /support and send a message to verify Gemini replies.");
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
