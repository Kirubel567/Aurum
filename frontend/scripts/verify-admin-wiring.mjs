#!/usr/bin/env node
// verify-admin-wiring.mjs — P5-A / P5-B / P7-B smoke tests
// (admin dashboard metrics, system settings, asset liquidity — real data wiring)
// Run: node --require dotenv/config scripts/verify-admin-wiring.mjs dotenv_config_path=.env.local
import "dotenv/config";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let ws;
try { ws = require("ws"); } catch { ws = undefined; }

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) { console.error("Missing env vars"); process.exit(1); }

const db = createClient(URL_, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: ws ? { transport: ws } : {},
});

let passed = 0; let failed = 0;

async function test(name, fn) {
  try { await fn(); console.log(`  ✓ ${name}`); passed++; }
  catch (e) { console.error(`  ✗ ${name}: ${e.message}`); failed++; }
}

console.log("\n── Admin Wiring: P5-A Dashboard / P5-B Settings / P7-B Liquidity ──\n");

// ── P5-A: Dashboard metrics dependencies ──────────────────────────────────────

await test("wallets table readable (AUM source)", async () => {
  const { error } = await db.from("wallets").select("balance").limit(1);
  if (error) throw new Error(error.message);
});

await test("yield_accrual_log readable (daily PnL source)", async () => {
  const { error } = await db.from("yield_accrual_log").select("yield_amount_usd, period_date").limit(1);
  if (error) throw new Error(error.message);
});

await test("equity_snapshots readable (AUM chart source)", async () => {
  const { error } = await db.from("equity_snapshots").select("user_id, equity, created_at").limit(1);
  if (error) throw new Error(error.message);
});

await test("dashboard metrics route file exists", async () => {
  if (!fs.existsSync("src/app/api/admin/dashboard/metrics/route.ts"))
    throw new Error("metrics route missing");
});

await test("dashboard page fetches real metrics API", async () => {
  const content = fs.readFileSync("src/app/(admin)/admin/dashboard/page.tsx", "utf8");
  if (!content.includes("/api/admin/dashboard/metrics")) throw new Error("page does not call metrics API");
  if (content.includes("mockReportCSV")) throw new Error("mock CSV export still present");
});

// ── P7-B: Liquidity dependencies ──────────────────────────────────────────────

await test("strategy_pools has active pools with targets", async () => {
  const { data, error } = await db
    .from("strategy_pools")
    .select("id, name, target_allocation_pct")
    .eq("active", true);
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("no active strategy pools found");
  const total = data.reduce((s, p) => s + Number(p.target_allocation_pct), 0);
  if (total > 100.01) throw new Error(`pool targets sum to ${total}% (> 100%)`);
});

await test("investor_pool_allocations readable", async () => {
  const { error } = await db.from("investor_pool_allocations").select("user_id, strategy_pool_id, allocation_pct").limit(1);
  if (error) throw new Error(error.message);
});

await test("liquidity routes exist (GET list + PATCH [id])", async () => {
  if (!fs.existsSync("src/app/api/admin/liquidity/route.ts")) throw new Error("liquidity GET route missing");
  if (!fs.existsSync("src/app/api/admin/liquidity/[id]/route.ts")) throw new Error("liquidity PATCH route missing");
});

await test("liquidity page uses real API (no hardcoded pools)", async () => {
  const content = fs.readFileSync("src/app/(admin)/admin/liquidity/page.tsx", "utf8");
  if (!content.includes("/api/admin/liquidity")) throw new Error("page does not call liquidity API");
  if (content.includes("BTC / USDC") || content.includes("Nexus Alpha")) throw new Error("fake DeFi pools still present");
});

await test("target_allocation_pct update round-trip", async () => {
  const { data: pool } = await db
    .from("strategy_pools")
    .select("id, target_allocation_pct")
    .eq("active", true)
    .limit(1)
    .single();
  if (!pool) throw new Error("no pool to test");
  const original = Number(pool.target_allocation_pct);

  const { error: upErr } = await db
    .from("strategy_pools")
    .update({ target_allocation_pct: original })
    .eq("id", pool.id);
  if (upErr) throw new Error(upErr.message);
});

// ── P5-B: Settings dependencies ───────────────────────────────────────────────

await test("system_settings singleton row exists", async () => {
  const { data, error } = await db
    .from("system_settings")
    .select("min_deposit_usd, min_withdrawal_usd, standard_withdrawal_fee_pct, express_withdrawal_fee_pct, lockup_period_days, updated_at")
    .eq("id", 1)
    .single();
  if (error) throw new Error(error.message);
  if (data.min_deposit_usd == null) throw new Error("min_deposit_usd missing");
});

await test("active_sessions readable (audit log source)", async () => {
  const { error } = await db.from("active_sessions").select("id, user_id, device_label, ip_address, created_at").limit(1);
  if (error) throw new Error(error.message);
});

await test("settings routes exist (GET/PATCH + audit-log)", async () => {
  if (!fs.existsSync("src/app/api/admin/settings/route.ts")) throw new Error("settings route missing");
  if (!fs.existsSync("src/app/api/admin/settings/audit-log/route.ts")) throw new Error("audit-log route missing");
});

await test("settings page uses real API (no mock keys/logs)", async () => {
  const content = fs.readFileSync("src/app/(admin)/admin/settings/page.tsx", "utf8");
  if (!content.includes("/api/admin/settings")) throw new Error("page does not call settings API");
  if (content.includes("MOCK_API_KEYS") || content.includes("INITIAL_LOGS")) throw new Error("mock data still present");
});

console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
