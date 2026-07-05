// Verifies lot-size/leverage/notional math and the auto-computed close
// P/L path (real numbers, real database round-trips). Self-cleaning.
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
  const invA = await makeUser(`ls-inv-${stamp}@example.com`, "investor");
  const superId = await makeUser(`ls-super-${stamp}@example.com`, "super_admin");

  const { data: pool, error: poolErr } = await admin
    .from("strategy_pools")
    .insert({ name: `LS Pool ${stamp}`, tag_color: "gold", tag: "Verification", target_allocation_pct: 100, sort_order: 99, active: true })
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
  const superCookies = await login(`ls-super-${stamp}@example.com`);
  const invACookies = await login(`ls-inv-${stamp}@example.com`);

  // NOTE: the P/L math checks use ZZZ/USD — a pair that classifies as forex
  // (so leverage/contract-size rules apply) but has NO live price feed. Since
  // /api/orders/live now overrides DB marks with real market prices whenever
  // a feed exists, a real pair like EUR/USD would make these assertions
  // non-deterministic; ZZZ/USD keeps the DB mark authoritative.

  // ── 1. Open requires lotSize now, not leverage ─────────────────────────────
  const missingLot = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "ZZZ/USD", side: "LONG", entryPrice: 1.10 }),
  });
  check("open rejects missing lotSize (400)", missingLot.status === 400, `status=${missingLot.status}`);

  // ── 2. Open with lot size auto-derives leverage label (forex = 1:100) ──────
  const open = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "ZZZ/USD", side: "LONG", entryPrice: 1.10, lotSize: 1.0 }),
  });
  const openBody = await open.json();
  const executionId = openBody.execution?.id;
  if (executionId) cleanupExecutionIds.push(executionId);
  check(
    "open with lot size succeeds, leverage auto-derived to 1:100 (forex)",
    open.status === 201 && Number(openBody.execution?.lot_size) === 1 && openBody.execution?.leverage === "1:100",
    JSON.stringify(openBody.execution).slice(0, 200)
  );

  // ── 3. Mark price up, close with NO realizedPlUsd — auto-computed ──────────
  // 1 lot forex = 100,000 units. Entry 1.10 -> mark 1.11 = +0.01 * 100,000 = +$1,000.
  await admin.from("wallets").update({ balance: 500 }).eq("user_id", invA);
  const priceUpdate = await fetch(`${BASE}/api/admin/console/executions/${executionId}/price`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ currentPrice: 1.11 }),
  });
  check("price marks to 1.11", priceUpdate.status === 200, `status=${priceUpdate.status}`);

  // ── 4. orders/live shows real floating P/L for the investor (100% share) ──
  const live = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invACookies } });
  const liveBody = await live.json();
  check(
    "orders/live computes real floating P/L from lot size (+$1000 on 1 lot ZZZ/USD)",
    liveBody.session?.floatingPlKnown === true && Math.abs(liveBody.session?.floatingPl - 1000) < 0.01,
    JSON.stringify(liveBody.session)
  );
  check("equity = balance + floating P/L", Math.abs(liveBody.session?.equity - (liveBody.session?.balance + liveBody.session?.floatingPl)) < 0.01, JSON.stringify(liveBody.session));

  // Close with NO realizedPlUsd body field at all — must auto-compute from lot_size.
  const close = await fetch(`${BASE}/api/admin/console/executions/${executionId}/close`, {
    method: "PATCH", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({}), // nothing supplied — closePrice defaults from current_price, P/L auto-computes
  });
  const closeBody = await close.json();
  check(
    "close with NO explicit price/P&L auto-computes both from lot_size (+$1000)",
    close.status === 200 && Number(closeBody.result?.realized_pl_usd) === 1000,
    JSON.stringify(closeBody)
  );

  const { data: wA } = await admin.from("wallets").select("balance").eq("user_id", invA).single();
  check("wallet credited exactly the auto-computed amount", Number(wA.balance) === 1500, `balance=${wA.balance}`);

  // ── 5. floating P/L returns to 0 (known) after the position closes ─────────
  const liveAfter = await fetch(`${BASE}/api/orders/live`, { headers: { Cookie: invACookies } });
  const liveAfterBody = await liveAfter.json();
  check("floating P/L is 0 and known once nothing is open", liveAfterBody.session?.floatingPl === 0 && liveAfterBody.session?.floatingPlKnown === true, JSON.stringify(liveAfterBody.session));

  // ── 6. Crypto asset gets its own leverage class (1:20) ──────────────────────
  const openCrypto = await fetch(`${BASE}/api/admin/console/executions`, {
    method: "POST", headers: { "Content-Type": "application/json", Cookie: superCookies },
    body: JSON.stringify({ strategyPoolId: testPoolId, assetPair: "BTC/USD", side: "LONG", entryPrice: 60000, lotSize: 0.1 }),
  });
  const openCryptoBody = await openCrypto.json();
  if (openCryptoBody.execution?.id) cleanupExecutionIds.push(openCryptoBody.execution.id);
  check("BTC/USD gets crypto leverage class (1:20)", openCryptoBody.execution?.leverage === "1:20", JSON.stringify(openCryptoBody.execution).slice(0, 150));

  // ── 7. Live price feed route works for a real forex pair ───────────────────
  const marketPrice = await fetch(`${BASE}/api/admin/console/market-price?assetPair=EUR/USD`, { headers: { Cookie: superCookies } });
  const marketPriceBody = await marketPrice.json();
  check("market-price route returns a real live forex quote", marketPrice.status === 200 && marketPriceBody.available === true && typeof marketPriceBody.price === "number", JSON.stringify(marketPriceBody));

  const marketPriceCrypto = await fetch(`${BASE}/api/admin/console/market-price?assetPair=BTC/USD`, { headers: { Cookie: superCookies } });
  const marketPriceCryptoBody = await marketPriceCrypto.json();
  check("market-price route returns a real live crypto quote", marketPriceCrypto.status === 200 && marketPriceCryptoBody.available === true && typeof marketPriceCryptoBody.price === "number", JSON.stringify(marketPriceCryptoBody));

  const marketPriceInvestorBlocked = await fetch(`${BASE}/api/admin/console/market-price?assetPair=EUR/USD`, { headers: { Cookie: invACookies } });
  check("investor blocked from market-price route (401)", marketPriceInvestorBlocked.status === 401, `status=${marketPriceInvestorBlocked.status}`);

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
