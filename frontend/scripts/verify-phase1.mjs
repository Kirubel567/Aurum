// Phase 1 verification — yield accrual RPC, dashboard summary/equity-curve,
// cron runner, RLS. Self-cleaning (throwaway investor + super_admin, all
// ledger/log rows removed at the end).
// Run from frontend/: node --experimental-websocket --env-file=.env.local scripts/verify-phase1.mjs
// Requires the dev server on localhost:3000 (started AFTER CRON_SECRET was added).
import { createClient as _sbCreateClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const __require = createRequire(import.meta.url);
let __ws; try { __ws = __require("ws"); } catch { __ws = undefined; }
// Node 20 lacks native WebSocket — inject ws transport so realtime-js does not crash at import.
const createClient = (url, key, opts = {}) =>
  _sbCreateClient(url, key, { ...opts, realtime: __ws ? { transport: __ws, ...(opts.realtime ?? {}) } : opts.realtime });

const BASE = "http://localhost:3000";
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const anon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const CRON_SECRET = process.env.CRON_SECRET;
const RATE = Number(process.env.DAILY_YIELD_RATE ?? "0.0032");

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  if (ok) pass++;
  else fail++;
}
const cookiesOf = (res) =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

const cleanupUserIds = [];

async function main() {
  const stamp = Date.now();
  const password = "ThrowawayTestPassword!123";
  const investorEmail = `p1-investor-${stamp}@example.com`;
  const superEmail = `p1-super-${stamp}@example.com`;

  // ── Setup: investor via real register API, then approve ────────────────────
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: investorEmail, password, fullName: "P1 Investor",
      username: `p1inv${stamp}`, phoneNumber: "+10000000000", country: "US",
    }),
  });
  const regBody = await reg.json();
  if (reg.status !== 200) throw new Error(`register failed: ${JSON.stringify(regBody)}`);
  const investorId = regBody.userId;
  cleanupUserIds.push(investorId);
  const investorCookies = cookiesOf(reg);
  await admin.from("deposit_users").update({ deposit_status: "approved", email_verified: true }).eq("id", investorId);

  // ── Setup: throwaway super_admin (to exercise admin_adjust_balance) ────────
  const { data: su, error: suErr } = await admin.auth.admin.createUser({
    email: superEmail, password, email_confirm: true,
  });
  if (suErr) throw new Error(`super_admin create failed: ${suErr.message}`);
  cleanupUserIds.push(su.user.id);
  await admin.from("deposit_users").update({
    role: "super_admin", deposit_status: "approved", email_verified: true, full_name: "P1 Super",
  }).eq("id", su.user.id);

  const { data: suSession, error: suSignIn } = await anon.auth.signInWithPassword({
    email: superEmail, password,
  });
  if (suSignIn) throw new Error(`super_admin sign-in failed: ${suSignIn.message}`);
  const suClient = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${suSession.session.access_token}` } },
  });

  // ── 1. Seed balance through the real RPC path ──────────────────────────────
  const { data: adjust, error: adjustErr } = await suClient.rpc("admin_adjust_balance", {
    p_user_id: investorId, p_amount: 5000, p_reason: "Phase 1 verification seed",
  });
  // Migration 015 changed admin_adjust_balance to RETURNS void — success is
  // simply the absence of an error (the balance/ledger checks below confirm).
  void adjust;
  check("super_admin can seed balance via admin_adjust_balance", !adjustErr, adjustErr?.message ?? "");

  // ── 2. Investor cannot call accrue_daily_yield ─────────────────────────────
  const { data: invSession } = await anon.auth.signInWithPassword({ email: investorEmail, password });
  const invClient = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${invSession.session.access_token}` } },
  });
  const today = new Date().toISOString().slice(0, 10);
  const { error: invAccrueErr } = await invClient.rpc("accrue_daily_yield", {
    p_user_id: investorId, p_period_date: today, p_yield_rate: 0.5,
  });
  check("investor blocked from calling accrue_daily_yield", !!invAccrueErr && /SERVICE_OR_SUPER_ADMIN/.test(invAccrueErr.message), invAccrueErr?.message ?? "no error raised");

  // ── 3. Cron route: bad secret rejected, good secret credits yield ──────────
  const badCron = await fetch(`${BASE}/api/cron/accrue-daily-yield`, {
    method: "POST", headers: { "x-cron-secret": "wrong" },
  });
  check("cron route rejects wrong secret (401)", badCron.status === 401, `status=${badCron.status}`);

  const cron1 = await fetch(`${BASE}/api/cron/accrue-daily-yield`, {
    method: "POST", headers: { "x-cron-secret": CRON_SECRET },
  });
  const cron1Body = await cron1.json();
  check("cron run succeeds and credits at least our investor", cron1.status === 200 && cron1Body.credited >= 1 && cron1Body.failed === 0, JSON.stringify(cron1Body));

  const expectedYield = Number((5000 * RATE).toFixed(2));

  // ── 4. Idempotency: second run skips, doesn't double-credit ────────────────
  const cron2 = await fetch(`${BASE}/api/cron/accrue-daily-yield`, {
    method: "POST", headers: { "x-cron-secret": CRON_SECRET },
  });
  const cron2Body = await cron2.json();
  const { data: walletAfter } = await admin.from("wallets").select("balance").eq("user_id", investorId).single();
  check("second cron run is a no-op (idempotent)", cron2.status === 200 && Number(walletAfter.balance) === 5000 + expectedYield, `balance=${walletAfter.balance} expected=${5000 + expectedYield} run2=${JSON.stringify(cron2Body)}`);

  // ── 5. Dashboard summary reflects reality ───────────────────────────────────
  const summary = await fetch(`${BASE}/api/dashboard/summary`, { headers: { Cookie: investorCookies } });
  const summaryBody = await summary.json();
  check(
    "summary: balance, MTD profit and recent transactions all correct",
    summary.status === 200 &&
      summaryBody.balance === 5000 + expectedYield &&
      summaryBody.monthToDateProfit === expectedYield &&
      summaryBody.recentTransactions.length === 2 &&
      summaryBody.recentTransactions[0].type === "interest_credit" &&
      summaryBody.recentTransactions[1].type === "manual_adjustment",
    JSON.stringify(summaryBody).slice(0, 250)
  );

  // ── 6. Equity curve ends at the real balance ────────────────────────────────
  const curve = await fetch(`${BASE}/api/dashboard/equity-curve?period=week`, { headers: { Cookie: investorCookies } });
  const curveBody = await curve.json();
  const lastPoint = curveBody.points?.[curveBody.points.length - 1];
  check(
    "equity curve: correct shape, final point equals balance, drawdown is underwater pct (<= 0)",
    curve.status === 200 && curveBody.points?.length === 7 && lastPoint?.equity === 5000 + expectedYield && lastPoint?.drawdown <= 0,
    JSON.stringify({ len: curveBody.points?.length, last: lastPoint })
  );

  const unauth = await fetch(`${BASE}/api/dashboard/summary`);
  check("summary requires auth (401)", unauth.status === 401, `status=${unauth.status}`);

  // ── 7. RLS probe on yield_accrual_log ───────────────────────────────────────
  // Fresh client: the shared `anon` instance holds the investor session in
  // memory after the signInWithPassword calls above, which would make this
  // probe authenticated instead of anonymous.
  const freshAnon = createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: anonRows } = await freshAnon.from("yield_accrual_log").select("id");
  check("anon sees zero yield_accrual_log rows", (anonRows ?? []).length === 0, `rows=${anonRows?.length}`);
  const { data: ownRows } = await invClient.from("yield_accrual_log").select("id, yield_amount_usd");
  check("investor sees exactly their own accrual row via RLS", ownRows?.length === 1 && Number(ownRows[0].yield_amount_usd) === expectedYield, JSON.stringify(ownRows));

  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail === 0 ? 0 : 1;
}

async function cleanup() {
  // Ledger rows have no FK cascade (append-only by design) — remove the
  // test transactions explicitly, including the paired platform-side rows.
  try {
    const { data: txns } = await admin
      .from("ledger_entries")
      .select("transaction_id")
      .in("account_id", cleanupUserIds);
    const txnIds = [...new Set((txns ?? []).map((t) => t.transaction_id))];
    if (txnIds.length > 0) {
      await admin.from("ledger_entries").delete().in("transaction_id", txnIds);
    }
  } catch { /* best effort */ }
  for (const id of cleanupUserIds) {
    try { await admin.auth.admin.deleteUser(id); } catch { /* best effort */ }
  }
  if (cleanupUserIds.length) console.log(`Cleaned up ${cleanupUserIds.length} account(s) + their ledger rows.`);
}

main()
  .catch((err) => { console.error("crashed:", err); process.exitCode = 1; })
  .finally(cleanup);
