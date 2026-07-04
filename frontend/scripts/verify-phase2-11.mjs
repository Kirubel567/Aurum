// Phase 2+11 verification — trading schema, console routes, close_trade_execution
// fan-out, live performance + dashboard trading endpoints, RLS.
// Self-cleaning: throwaway investors/super_admin, trade rows, ledger rows.
// Run from frontend/: node --experimental-websocket --env-file=.env.local scripts/verify-phase2-11.mjs
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (ok) pass++;
  else fail++;
}
const cookiesOf = (res) =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

const cleanupUserIds = [];
const cleanupExecutionIds = [];
let testPoolId = null;

async function main() {
  const stamp = Date.now();
  const password = "ThrowawayTestPassword!123";

  // ── Setup: two investors (60/40 split via allocations) + one super_admin ──
  async function makeUser(email, role, extra = {}) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    cleanupUserIds.push(data.user.id);
    await admin.from("deposit_users").update({ role, deposit_status: "approved", email_verified: true, full_name: email.split("@")[0], ...extra }).eq("id", data.user.id);
    return data.user.id;
  }
  const invA = await makeUser(`p2-inv-a-${stamp}@example.com`, "investor");
  const invB = await makeUser(`p2-inv-b-${stamp}@example.com`, "investor");
  const superId = await makeUser(`p2-super-${stamp}@example.com`, "super_admin");

  // Isolated test pool so we never touch real investors' allocations.
  const { data: pool, error: poolErr } = await admin
    .from("strategy_pools")
    .insert({ name: `Test Pool ${stamp}`, tag_color: "gold", tag: "Verification", target_allocation_pct: 100, sort_order: 99, active: false })
    .select().single();
  if (poolErr) throw new Error(`pool insert: ${poolErr.message}`);
  testPoolId = pool.id;

  await admin.from("investor_pool_allocations").insert([
    { user_id: invA, strategy_pool_id: testPoolId, allocation_pct: 60 },
    { user_id: invB, strategy_pool_id: testPoolId, allocation_pct: 40 },
  ]);

  const login = async (email) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) throw new Error(`login ${email}: ${res.status}`);
    return cookiesOf(res);
  };
  const superCookies = await login(`p2-super-${stamp}@example.com`);
  const invACookies = await login(`p2-inv-a-${stamp}@example.com`);

  // ── 1. Investor blocked from console routes ────────────────────────────────
  const invConsole = await fetch(`${BASE}/api/admin/console/executions`, { headers: { Cookie: invACookies } });
  check("investor blocked from console list (401)", invConsole.status === 401, `status=${invConsole.status}`);

  // ── 2. super_admin opens a position ────────────────────────────────────────
  const open = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "eur/usd", side: "LONG", lotSize: 1.0, entryPrice: 1.084, note: "TP 1.092, SL 1.078" }),
  });
  const openBody = await open.json();
  const executionId = openBody.execution?.id;
  if (executionId) cleanupExecutionIds.push(executionId);
  check("super_admin opens a position (201, uppercased pair)", open.status === 201 && openBody.execution?.asset_pair === "EUR/USD", `status=${open.status} ${JSON.stringify(openBody).slice(0, 140)}`);

  // ── 3. Investor sees it on /api/orders/live ────────────────────────────────
  const live = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invACookies } });
  const liveBody = await live.json();
  check(
    "investor sees the open position + own allocations on orders/live",
    live.status === 200 &&
      liveBody.executions?.some((e) => e.id === executionId && e.type === "LONG") &&
      liveBody.strategyPools?.some((p) => p.id === testPoolId ? p.allocation === 60 : true),
    JSON.stringify({ execs: liveBody.executions?.length, pools: liveBody.strategyPools?.length }).slice(0, 140)
  );

  // ── 4. Price update propagates ─────────────────────────────────────────────
  const price = await fetch(`${BASE}/api/admin/console/executions/${executionId}/price`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ currentPrice: 1.09 }),
  });
  check("price update succeeds", price.status === 200, `status=${price.status}`);

  // ── 5. Seed wallets, then close → proportional fan-out ─────────────────────
  await admin.from("wallets").update({ balance: 1000 }).eq("user_id", invA);
  await admin.from("wallets").update({ balance: 1000 }).eq("user_id", invB);
  // (direct seed is test scaffolding only; production money always moves via RPCs)

  const close = await fetch(`${BASE}/api/admin/console/executions/${executionId}/close`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ closePrice: 1.09, realizedPlUsd: 1000 }),
  });
  const closeBody = await close.json();
  check("close succeeds and credits both investors", close.status === 200 && closeBody.result?.investors_credited === 2 && Number(closeBody.result?.total_distributed) === 1000, JSON.stringify(closeBody));

  const { data: wA } = await admin.from("wallets").select("balance").eq("user_id", invA).single();
  const { data: wB } = await admin.from("wallets").select("balance").eq("user_id", invB).single();
  check("P/L split matches 60/40 allocations exactly", Number(wA.balance) === 1600 && Number(wB.balance) === 1400, `A=${wA.balance} B=${wB.balance}`);

  // ── 6. Ledger invariant: every trade_pl transaction sums to zero ───────────
  const { data: plRows } = await admin
    .from("ledger_entries")
    .select("transaction_id, amount")
    .eq("reference_id", executionId);
  const byTxn = new Map();
  for (const r of plRows ?? []) byTxn.set(r.transaction_id, (byTxn.get(r.transaction_id) ?? 0) + Number(r.amount));
  check("paired trade_pl ledger rows sum to zero per transaction", byTxn.size === 2 && [...byTxn.values()].every((v) => Math.abs(v) < 0.005), JSON.stringify([...byTxn.values()]));

  // ── 7. Double-close rejected ───────────────────────────────────────────────
  const reclose = await fetch(`${BASE}/api/admin/console/executions/${executionId}/close`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ closePrice: 1.09, realizedPlUsd: 1000 }),
  });
  const { data: wA2 } = await admin.from("wallets").select("balance").eq("user_id", invA).single();
  check("double-close rejected (409), no double credit", reclose.status === 409 && Number(wA2.balance) === 1600, `status=${reclose.status} balance=${wA2.balance}`);

  // ── 8. Dashboard trading endpoint reflects the closed trade ────────────────
  const trading = await fetch(`${BASE}/api/dashboard/trading`, { headers: { Cookie: invACookies } });
  const tradingBody = await trading.json();
  check(
    "dashboard/trading: allocation + best trades + gainer populated",
    trading.status === 200 &&
      tradingBody.allocation?.length > 0 &&
      tradingBody.bestTrades?.some((t) => t.asset === "EUR/USD" && t.profit === 1000) &&
      tradingBody.gainerLoser?.profitable?.some((g) => g.name === "EUR/USD"),
    JSON.stringify(tradingBody).slice(0, 200)
  );

  // ── 9. RLS probes ──────────────────────────────────────────────────────────
  const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: anonPools } = await anon.from("strategy_pools").select("id");
  const { data: anonAllocs } = await anon.from("investor_pool_allocations").select("id");
  check("anon sees zero pools and zero allocations (RLS)", (anonPools ?? []).length === 0 && (anonAllocs ?? []).length === 0, `pools=${anonPools?.length} allocs=${anonAllocs?.length}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
}

async function cleanup() {
  try {
    if (cleanupExecutionIds.length) {
      await admin.from("ledger_entries").delete().in("reference_id", cleanupExecutionIds);
      await admin.from("manual_trade_adjustments").delete().in("trade_execution_id", cleanupExecutionIds);
      await admin.from("trade_executions").delete().in("id", cleanupExecutionIds);
    }
    if (testPoolId) {
      await admin.from("investor_pool_allocations").delete().eq("strategy_pool_id", testPoolId);
      await admin.from("strategy_pools").delete().eq("id", testPoolId);
    }
  } catch (err) {
    console.error("cleanup (rows):", err.message);
  }
  for (const id of cleanupUserIds) {
    try { await admin.auth.admin.deleteUser(id); } catch { /* best effort */ }
  }
  console.log(`Cleaned up ${cleanupUserIds.length} account(s), ${cleanupExecutionIds.length} execution(s), 1 test pool.`);
}

main()
  .catch((err) => { console.error("crashed:", err); process.exitCode = 1; })
  .finally(cleanup);
