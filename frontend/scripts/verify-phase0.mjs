// Phase 0 verification — notifications, admin summary/search/activity, RLS.
// Self-cleaning: creates one throwaway investor + one throwaway admin,
// deletes both (and their cascade-linked notifications) at the end.
// Run from frontend/: node --experimental-websocket --env-file=.env.local scripts/verify-phase0.mjs
// Requires the dev server on localhost:3000.
import { createClient as _sbCreateClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const __require = createRequire(import.meta.url);
let __ws; try { __ws = __require("ws"); } catch { __ws = undefined; }
// Node 20 lacks native WebSocket — inject ws transport so realtime-js does not crash at import.
const createClient = (url, key, opts = {}) =>
  _sbCreateClient(url, key, { ...opts, realtime: __ws ? { transport: __ws, ...(opts.realtime ?? {}) } : opts.realtime });

const BASE = "http://localhost:3000";
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  " + detail}`);
  ok ? pass++ : fail++;
}
const cookiesOf = (res) =>
  (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");

const cleanupIds = [];

async function main() {
  const stamp = Date.now();
  const investorEmail = `phase0-investor-${stamp}@example.com`;
  const adminEmail = `phase0-admin-${stamp}@example.com`;
  const password = "ThrowawayTestPassword!123";

  // ── Setup: throwaway investor via the real register API ────────────────────
  const reg = await fetch(`${BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: investorEmail, password,
      fullName: "Phase Zero Investor",
      username: `p0inv${stamp}`, phoneNumber: "+10000000000", country: "US",
    }),
  });
  const regBody = await reg.json();
  if (reg.status !== 200) {
    throw new Error(`Setup failed — could not register investor: ${JSON.stringify(regBody)}`);
  }
  cleanupIds.push(regBody.userId);
  const investorCookies = cookiesOf(reg);

  // ── Setup: throwaway admin via service role ────────────────────────────────
  const { data: adminCreated, error: adminErr } = await admin.auth.admin.createUser({
    email: adminEmail, password, email_confirm: true,
  });
  if (adminErr || !adminCreated?.user) {
    throw new Error(`Setup failed — could not create admin: ${adminErr?.message}`);
  }
  cleanupIds.push(adminCreated.user.id);
  await admin.from("deposit_users").update({
    role: "admin", deposit_status: "approved", email_verified: true, full_name: "Phase Zero Admin",
  }).eq("id", adminCreated.user.id);

  const adminLogin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: adminEmail, password }),
  });
  const adminCookies = cookiesOf(adminLogin);
  if (adminLogin.status !== 200) {
    throw new Error(`Setup failed — admin login: ${adminLogin.status}`);
  }

  // ── 1. Investor notifications start empty ──────────────────────────────────
  const empty = await fetch(`${BASE}/api/notifications`, { headers: { Cookie: investorCookies } });
  const emptyBody = await empty.json();
  check("investor notifications endpoint returns empty state", empty.status === 200 && emptyBody.unreadCount === 0 && emptyBody.notifications.length === 0, JSON.stringify(emptyBody).slice(0, 120));

  // ── 2. System-generated notification is visible to the investor ────────────
  // (The old unauthenticated deposit-decision link was retired in Phase 13;
  // deposit approval notifications are covered by verify-phase4-13. Here we
  // only care that the notifications API surface works, so insert directly.)
  await admin.from("notifications").insert({
    user_id: regBody.userId, type: "deposit_status",
    title: "Deposit approved", body: "Phase 0 test notification", link_path: "/wallet",
  });
  const after = await fetch(`${BASE}/api/notifications`, { headers: { Cookie: investorCookies } });
  const afterBody = await after.json();
  const note = afterBody.notifications?.[0];
  check("deposit approval created a notification", afterBody.unreadCount === 1 && note?.type === "deposit_status" && /approved/i.test(note?.title ?? ""), JSON.stringify(afterBody).slice(0, 200));

  // ── 3. Mark one read ────────────────────────────────────────────────────────
  const markRead = await fetch(`${BASE}/api/notifications/${note.id}/read`, {
    method: "PATCH", headers: { Cookie: investorCookies },
  });
  const afterRead = await (await fetch(`${BASE}/api/notifications`, { headers: { Cookie: investorCookies } })).json();
  check("mark-read works", markRead.status === 200 && afterRead.unreadCount === 0 && afterRead.notifications[0]?.read === true, JSON.stringify(afterRead).slice(0, 120));

  // ── 4. Another notification, then read-all ─────────────────────────────────
  await admin.from("notifications").insert({
    user_id: regBody.userId, type: "deposit_status",
    title: "Deposit rejected", body: "Phase 0 test notification", link_path: "/wallet",
  });
  const readAll = await fetch(`${BASE}/api/notifications/read-all`, {
    method: "PATCH", headers: { Cookie: investorCookies },
  });
  const afterReadAll = await (await fetch(`${BASE}/api/notifications`, { headers: { Cookie: investorCookies } })).json();
  check("read-all clears every unread", readAll.status === 200 && afterReadAll.unreadCount === 0 && afterReadAll.notifications.length === 2, JSON.stringify({ unread: afterReadAll.unreadCount, total: afterReadAll.notifications.length }));

  // ── 5. Cross-user isolation: investor can't mark admin's rows ──────────────
  await admin.from("notifications").insert({
    user_id: adminCreated.user.id, type: "system_alert", title: "Isolation probe",
  });
  const { data: adminNote } = await admin.from("notifications")
    .select("id").eq("user_id", adminCreated.user.id).single();
  await fetch(`${BASE}/api/notifications/${adminNote.id}/read`, {
    method: "PATCH", headers: { Cookie: investorCookies },
  });
  const { data: probeRow } = await admin.from("notifications")
    .select("read").eq("id", adminNote.id).single();
  check("investor cannot mark another user's notification read", probeRow.read === false, `read=${probeRow.read}`);

  // ── 6. Admin summary: staff sees real counts, investor is blocked ──────────
  const summary = await fetch(`${BASE}/api/admin/notifications/summary`, { headers: { Cookie: adminCookies } });
  const summaryBody = await summary.json();
  check("admin summary returns count shape", summary.status === 200 && ["pendingDeposits", "pendingWithdrawals", "unreadMessages", "systemAlerts"].every((k) => typeof summaryBody[k] === "number"), JSON.stringify(summaryBody));
  const summaryBlocked = await fetch(`${BASE}/api/admin/notifications/summary`, { headers: { Cookie: investorCookies } });
  check("investor blocked from admin summary (401)", summaryBlocked.status === 401, `status=${summaryBlocked.status}`);

  // ── 7. Admin search finds the throwaway investor; investor blocked ─────────
  const search = await fetch(`${BASE}/api/admin/search-users?q=${encodeURIComponent(`phase0-investor-${stamp}`)}`, { headers: { Cookie: adminCookies } });
  const searchBody = await search.json();
  check("admin user search finds by email", search.status === 200 && searchBody.results?.some((r) => r.email === investorEmail), JSON.stringify(searchBody).slice(0, 160));
  const searchBlocked = await fetch(`${BASE}/api/admin/search-users?q=test`, { headers: { Cookie: investorCookies } });
  check("investor blocked from user search (401)", searchBlocked.status === 401, `status=${searchBlocked.status}`);

  // ── 8. Activity feed includes the new registration; investor blocked ───────
  const activity = await fetch(`${BASE}/api/admin/activity`, { headers: { Cookie: adminCookies } });
  const activityBody = await activity.json();
  check("activity feed includes the new registration", activity.status === 200 && activityBody.events?.some((e) => e.kind === "registration" && e.detail.includes(investorEmail)), JSON.stringify(activityBody.events?.slice(0, 3)));
  const activityBlocked = await fetch(`${BASE}/api/admin/activity`, { headers: { Cookie: investorCookies } });
  check("investor blocked from activity feed (401)", activityBlocked.status === 401, `status=${activityBlocked.status}`);

  // ── 9. RLS probe: anon client sees nothing ─────────────────────────────────
  const { data: anonRows, error: anonError } = await anon.from("notifications").select("id");
  check("anon client sees zero notification rows (RLS fail-closed)", !anonError && (anonRows ?? []).length === 0, `rows=${anonRows?.length} err=${anonError?.message ?? "none"}`);

  console.log(`\n${pass} passed, ${fail} failed`);
  // exitCode (not process.exit) so the finally-cleanup still runs.
  process.exitCode = fail === 0 ? 0 : 1;
}

async function cleanup() {
  for (const id of cleanupIds) {
    try { await admin.auth.admin.deleteUser(id); } catch { /* best effort */ }
  }
  if (cleanupIds.length) console.log(`Cleaned up ${cleanupIds.length} throwaway account(s).`);
}

main()
  .catch((err) => { console.error("crashed:", err); process.exitCode = 1; })
  .finally(cleanup);
