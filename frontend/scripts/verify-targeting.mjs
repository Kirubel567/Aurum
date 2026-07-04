// Verifies account-manager targeted trades vs super_admin pool broadcasts.
// Self-cleaning.
import { createClient } from "@supabase/supabase-js";

const BASE = "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (ok) pass++; else fail++;
}
const cookiesOf = (res) => (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

const cleanupUserIds = [];
const cleanupExecutionIds = [];
let testPoolId = null;

async function main() {
  const stamp = Date.now();
  const password = "ThrowawayTestPassword!123";

  async function makeUser(email, role) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    cleanupUserIds.push(data.user.id);
    await admin.from("deposit_users").update({ role, deposit_status: "approved", email_verified: true, full_name: email.split("@")[0] }).eq("id", data.user.id);
    return data.user.id;
  }
  const managerA = await makeUser(`tg-mgrA-${stamp}@example.com`, "admin");
  const managerB = await makeUser(`tg-mgrB-${stamp}@example.com`, "admin");
  const superId = await makeUser(`tg-super-${stamp}@example.com`, "super_admin");
  const invAssignedToA = await makeUser(`tg-inv-a-${stamp}@example.com`, "investor");
  const invUnassigned = await makeUser(`tg-inv-u-${stamp}@example.com`, "investor");

  const { data: pool, error: poolErr } = await admin
    .from("strategy_pools")
    .insert({ name: `TG Pool ${stamp}`, tag_color: "gold", tag: "Verification", target_allocation_pct: 100, sort_order: 99, active: true })
    .select().single();
  if (poolErr) throw new Error(`pool insert: ${poolErr.message}`);
  testPoolId = pool.id;

  const login = async (email) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) throw new Error(`login ${email}: ${res.status}`);
    return cookiesOf(res);
  };
  const superCookies = await login(`tg-super-${stamp}@example.com`);
  const mgrACookies = await login(`tg-mgrA-${stamp}@example.com`);
  const mgrBCookies = await login(`tg-mgrB-${stamp}@example.com`);
  const invACookies = await login(`tg-inv-a-${stamp}@example.com`);
  const invUCookies = await login(`tg-inv-u-${stamp}@example.com`);

  // ── 1. Assignment: super_admin assigns invA to managerA ────────────────────
  const assign = await fetch(`${BASE}/api/admin/assignments`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ investorId: invAssignedToA, adminId: managerA }),
  });
  check("super_admin can create an assignment", assign.status === 200, `status=${assign.status}`);

  const assignBlocked = await fetch(`${BASE}/api/admin/assignments`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: mgrACookies },
    body: JSON.stringify({ investorId: invUnassigned, adminId: managerA }),
  });
  check("admin (non-super) blocked from creating assignments (403)", assignBlocked.status === 403, `status=${assignBlocked.status}`);

  // ── 2. managerA cannot broadcast (no targetInvestorId) ──────────────────────
  const broadcastAttempt = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: mgrACookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "EUR/USD", side: "LONG", entryPrice: 1.1, lotSize: 1.0 }),
  });
  check("admin cannot open a pool-wide broadcast (403)", broadcastAttempt.status === 403, `status=${broadcastAttempt.status}`);

  // ── 3. managerA cannot target an investor NOT assigned to them ─────────────
  const wrongTarget = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: mgrACookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "EUR/USD", side: "LONG", entryPrice: 1.1, lotSize: 1.0, targetInvestorId: invUnassigned }),
  });
  check("admin blocked from targeting an unassigned investor (403)", wrongTarget.status === 403, `status=${wrongTarget.status}`);

  // ── 4. managerA CAN target their own assigned investor ──────────────────────
  const goodOpen = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: mgrACookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "EUR/USD", side: "LONG", entryPrice: 1.10, lotSize: 1.0, takeProfitPrice: 1.20, stopLossPrice: 1.05, targetInvestorId: invAssignedToA }),
  });
  const goodOpenBody = await goodOpen.json();
  const executionId = goodOpenBody.execution?.id;
  if (executionId) cleanupExecutionIds.push(executionId);
  check("admin opens a trade targeted at their own assigned investor", goodOpen.status === 201 && goodOpenBody.execution?.target_investor_id === invAssignedToA, JSON.stringify(goodOpenBody).slice(0, 200));

  // ── 5. Targeted investor sees it; unassigned investor does not ─────────────
  const liveA = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invACookies } });
  const liveABody = await liveA.json();
  check("targeted investor sees the trade on orders/live", liveABody.executions?.some((e) => e.id === executionId), JSON.stringify(liveABody.executions?.length));

  const liveU = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invUCookies } });
  const liveUBody = await liveU.json();
  check("unassigned investor does NOT see the targeted trade", !liveUBody.executions?.some((e) => e.id === executionId), JSON.stringify(liveUBody.executions?.length));

  // ── 6. managerB cannot close managerA's targeted trade ──────────────────────
  const priceUpdate = await fetch(`${BASE}/api/admin/console/executions/${executionId}/price`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: mgrBCookies },
    body: JSON.stringify({ currentPrice: 1.15 }),
  });
  check("managerB blocked from updating managerA's targeted trade's price (403)", priceUpdate.status === 403, `status=${priceUpdate.status}`);

  const closeAttemptB = await fetch(`${BASE}/api/admin/console/executions/${executionId}/close`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: mgrBCookies },
    body: JSON.stringify({ closePrice: 1.15, realizedPlUsd: 300 }),
  });
  check("managerB blocked from closing managerA's targeted trade (403)", closeAttemptB.status === 403, `status=${closeAttemptB.status}`);

  // ── 7. managerA CAN close their own targeted trade — 100% to that investor ─
  await admin.from("wallets").update({ balance: 1000 }).eq("user_id", invAssignedToA);
  const closeA = await fetch(`${BASE}/api/admin/console/executions/${executionId}/close`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: mgrACookies },
    body: JSON.stringify({ closePrice: 1.15, realizedPlUsd: 300 }),
  });
  const closeABody = await closeA.json();
  check("managerA closes their own targeted trade successfully", closeA.status === 200 && closeABody.result?.investors_credited === 1 && closeABody.result?.targeted === true, JSON.stringify(closeABody));

  const { data: wA } = await admin.from("wallets").select("balance").eq("user_id", invAssignedToA).single();
  check("targeted close credited 100% to the one investor (no pool fan-out)", Number(wA.balance) === 1300, `balance=${wA.balance}`);

  // ── 8. super_admin CAN broadcast a pool-wide trade ──────────────────────────
  const superBroadcast = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "GBP/USD", side: "SHORT", entryPrice: 1.25, lotSize: 1.0 }),
  });
  const superBroadcastBody = await superBroadcast.json();
  const broadcastId = superBroadcastBody.execution?.id;
  if (broadcastId) cleanupExecutionIds.push(broadcastId);
  check("super_admin can still broadcast pool-wide (target_investor_id null)", superBroadcast.status === 201 && superBroadcastBody.execution?.target_investor_id === null, JSON.stringify(superBroadcastBody).slice(0, 150));

  // ── 9. RLS: unassigned investor's own client can't see managerA's roster ───
  const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: anonAssignments } = await anon.from("account_manager_assignments").select("id");
  check("anon sees zero assignment rows (RLS)", (anonAssignments ?? []).length === 0, `rows=${anonAssignments?.length}`);

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
    await admin.from("account_manager_assignments").delete().in("admin_id", cleanupUserIds);
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

main().catch((err) => { console.error("crashed:", err); process.exitCode = 1; }).finally(cleanup);
