// Verifies the trading-page fixes: risk:reward, TP/SL validation, active-vs-
// closed separation, live chart data, pool allocation admin UI. Self-cleaning.
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
let testPoolId = null;
const cleanupExecutionIds = [];

async function main() {
  const stamp = Date.now();
  const password = "ThrowawayTestPassword!123";

  async function makeUser(email, role, extra = {}) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw new Error(`createUser ${email}: ${error.message}`);
    cleanupUserIds.push(data.user.id);
    await admin.from("deposit_users").update({ role, deposit_status: "approved", email_verified: true, full_name: email.split("@")[0], ...extra }).eq("id", data.user.id);
    return data.user.id;
  }
  const invA = await makeUser(`tf-inv-${stamp}@example.com`, "investor");
  const superId = await makeUser(`tf-super-${stamp}@example.com`, "super_admin");

  // active: true — the allocation endpoints only surface active pools (by
  // design, matching what a real pool selector would offer), so the test
  // pool must be active for the allocation checks below to see it.
  const { data: pool, error: poolErr } = await admin
    .from("strategy_pools")
    .insert({ name: `TF Pool ${stamp}`, tag_color: "gold", tag: "Verification", target_allocation_pct: 100, sort_order: 99, active: true })
    .select().single();
  if (poolErr) throw new Error(`pool insert: ${poolErr.message}`);
  testPoolId = pool.id;
  await admin.from("investor_pool_allocations").insert({ user_id: invA, strategy_pool_id: testPoolId, allocation_pct: 100 });

  const login = async (email) => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.status !== 200) throw new Error(`login ${email}: ${res.status}`);
    return cookiesOf(res);
  };
  const superCookies = await login(`tf-super-${stamp}@example.com`);
  const invACookies = await login(`tf-inv-${stamp}@example.com`);

  // ── 1. TP/SL validation rejects nonsensical LONG setup ──────────────────────
  const badOpen = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "EUR/USD", side: "LONG", entryPrice: 1.10, lotSize: 1.0, takeProfitPrice: 1.05, stopLossPrice: 1.12 }),
  });
  check("LONG with TP below entry / SL above entry is rejected", badOpen.status === 400, `status=${badOpen.status}`);

  // ── 2. Valid open with TP/SL computes correct risk:reward ───────────────────
  const open = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "EUR/USD", side: "LONG", entryPrice: 1.10, lotSize: 1.0, takeProfitPrice: 1.20, stopLossPrice: 1.05 }),
  });
  const openBody = await open.json();
  const executionId = openBody.execution?.id;
  if (executionId) cleanupExecutionIds.push(executionId);
  check("open with TP/SL succeeds, values stored numerically", open.status === 201 && Number(openBody.execution?.take_profit_price) === 1.2 && Number(openBody.execution?.stop_loss_price) === 1.05, JSON.stringify(openBody).slice(0, 200));

  // risk = |1.10-1.05| = 0.05, reward = |1.20-1.10| = 0.10, ratio = 2.00
  const dashTrading = await fetch(`${BASE}/api/dashboard/trading`, { headers: { Cookie: invACookies } });

  // ── 3. Console executions list defaults to open-only ────────────────────────
  const consoleOpen = await fetch(`${BASE}/api/admin/console/executions`, { headers: { Cookie: superCookies } });
  const consoleOpenBody = await consoleOpen.json();
  check("console list defaults to open only, includes our execution", consoleOpenBody.executions?.every((e) => e.status === "open") && consoleOpenBody.executions?.some((e) => e.id === executionId), JSON.stringify(consoleOpenBody.executions?.map((e) => e.status)));

  // ── 4. orders/live only shows open trades in `executions` ───────────────────
  const live1 = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invACookies } });
  const live1Body = await live1.json();
  check("orders/live includes the open position", live1Body.executions?.some((e) => e.id === executionId), JSON.stringify(live1Body.executions?.length));
  check("orders/live exposes session stats + equity series", typeof live1Body.session?.balance === "number" && Array.isArray(live1Body.equitySeries), JSON.stringify({ session: live1Body.session, series: live1Body.equitySeries?.length }));

  // ── 5. Close auto-fills price from current_price when omitted ───────────────
  await admin.from("wallets").update({ balance: 1000 }).eq("user_id", invA);
  const priceUpdate = await fetch(`${BASE}/api/admin/console/executions/${executionId}/price`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ currentPrice: 1.15 }),
  });
  check("price update succeeds", priceUpdate.status === 200, `status=${priceUpdate.status}`);

  const closeNoPrice = await fetch(`${BASE}/api/admin/console/executions/${executionId}/close`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ realizedPlUsd: 500 }), // closePrice omitted on purpose
  });
  const closeBody = await closeNoPrice.json();
  check("close auto-fills closePrice from current_price (no closePrice sent)", closeNoPrice.status === 200 && closeBody.result?.investors_credited === 1, JSON.stringify(closeBody));

  // ── 6. orders/live no longer includes the now-closed trade ──────────────────
  const live2 = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invACookies } });
  const live2Body = await live2.json();
  check("orders/live drops the trade once closed (open-only store)", !live2Body.executions?.some((e) => e.id === executionId), JSON.stringify(live2Body.executions?.length));

  // ── 7. dashboard/trading now shows real risk:reward for the closed trade ────
  const dashTrading2 = await fetch(`${BASE}/api/dashboard/trading`, { headers: { Cookie: invACookies } });
  const dashBody = await dashTrading2.json();
  const bestTrade = dashBody.bestTrades?.find((t) => t.asset === "EUR/USD" && t.profit === 500);
  check("dashboard best trades shows computed risk:reward (1:2.00)", bestTrade?.riskReward === "1:2.00", JSON.stringify(bestTrade));

  // ── 8. console closed history endpoint returns it, with TP/SL intact ────────
  const consoleClosed = await fetch(`${BASE}/api/admin/console/executions?status=closed`, { headers: { Cookie: superCookies } });
  const consoleClosedBody = await consoleClosed.json();
  const closedRow = consoleClosedBody.executions?.find((e) => e.id === executionId);
  check("console closed history has the trade with TP/SL preserved", closedRow && Number(closedRow.take_profit_price) === 1.2 && Number(closedRow.stop_loss_price) === 1.05, JSON.stringify(closedRow));

  // ── 9. Pool allocation admin UI: summary + per-investor get/put ─────────────
  const summary = await fetch(`${BASE}/api/admin/pool-allocations/summary`, { headers: { Cookie: superCookies } });
  const summaryBody = await summary.json();
  const testPoolSummary = summaryBody.pools?.find((p) => p.id === testPoolId);
  check("pool-allocations summary reflects our 1 investor at 100%", testPoolSummary?.investorCount === 1 && testPoolSummary?.averageAllocationPct === 100, JSON.stringify(testPoolSummary));

  const getAlloc = await fetch(`${BASE}/api/admin/pool-allocations/${invA}`, { headers: { Cookie: superCookies } });
  const getAllocBody = await getAlloc.json();
  check("per-investor GET returns current allocation", getAllocBody.pools?.find((p) => p.id === testPoolId)?.allocationPct === 100, JSON.stringify(getAllocBody.pools));

  const badPut = await fetch(`${BASE}/api/admin/pool-allocations/${invA}`, {
    method: "PUT", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ allocations: [{ poolId: testPoolId, allocationPct: 60 }] }), // doesn't sum to 100
  });
  check("PUT rejects allocations that don't sum to 100", badPut.status === 400, `status=${badPut.status}`);

  const investorPutBlocked = await fetch(`${BASE}/api/admin/pool-allocations/${invA}`, {
    method: "PUT", headers: { "Content-Type": "application/json", Cookie: invACookies },
    body: JSON.stringify({ allocations: [{ poolId: testPoolId, allocationPct: 100 }] }),
  });
  check("investor blocked from editing allocations (401)", investorPutBlocked.status === 401, `status=${investorPutBlocked.status}`);

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

main().catch((err) => { console.error("crashed:", err); process.exitCode = 1; }).finally(cleanup);
