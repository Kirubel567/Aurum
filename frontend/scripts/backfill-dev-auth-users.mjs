// ============================================================================
// Section D backfill — DEV ONLY. Do not run this script's password-printing
// behavior against production; see the "PROD DIFFERENCES" note at the
// bottom before ever adapting this for the real cutover.
// ============================================================================
//
// What this does, once per existing deposit_users row:
//   1. Creates a real auth.users row via the Supabase Admin API, with a
//      random temporary password and email_confirm: true (so it's usable
//      immediately in dev without an email round-trip).
//   2. Calls the backfill_repoint_user_id(old_id, new_id) SQL function
//      (added in migration 003) to atomically move deposit_users.id — and
//      every messages.investor_id row that pointed at the old id — to the
//      new auth.users.id.
//   3. Prints the temp password to the console so you can manually confirm
//      login works with the new Supabase Auth session before moving on to
//      migration 004.
//
// Idempotent: rows whose id is already a valid UUID (i.e., already
// backfilled) are skipped, so re-running this script after a partial
// failure is safe — it only processes what's left.
//
// Run with:
//   node --experimental-websocket --env-file=.env.local scripts/backfill-dev-auth-users.mjs
//
// The --experimental-websocket flag is required on Node 20: supabase-js
// always initializes a Realtime client internally (even though this script
// never uses realtime features), and that requires a global WebSocket
// constructor Node 20 doesn't expose by default. Node 22+ has this on by
// default and the flag becomes a harmless no-op there.
// (run from the frontend/ directory, where .env.local lives)
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to
// already be set in .env.local — both are already there per this
// project's existing setup.
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Run this with: node --env-file=.env.local scripts/backfill-dev-auth-users.mjs"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateTempPassword() {
  // 24 random bytes, base64url-encoded — well above any reasonable minimum
  // length requirement, dev-only, never persisted anywhere but this
  // console output.
  return crypto.randomBytes(24).toString("base64url");
}

async function main() {
  console.log("Fetching deposit_users rows...");
  const { data: rows, error: fetchError } = await supabase
    .from("deposit_users")
    .select("id, email, full_name, role");

  if (fetchError) {
    console.error("Failed to fetch deposit_users:", fetchError);
    process.exit(1);
  }

  console.log(`Found ${rows.length} row(s) total.`);

  const results = { migrated: [], skipped: [], failed: [] };

  for (const row of rows) {
    if (UUID_RE.test(row.id)) {
      // UUID-shaped is not proof of a real migration — a stale id from an
      // earlier deleted auth.users row (e.g. a prior test of the
      // create-admin flow whose auth.users row was later removed) would
      // pass this shape check too. Confirm the id actually resolves to a
      // real identity before trusting it.
      const { data: existing } = await supabase.auth.admin.getUserById(row.id);
      if (existing?.user) {
        console.log(`SKIP  ${row.email} — id already migrated and confirmed against auth.users (${row.id}).`);
        results.skipped.push(row.email);
        continue;
      }
      console.log(`RE-MIGRATE  ${row.email} — id ${row.id} is UUID-shaped but has no matching auth.users row (stale/orphaned). Treating as unmigrated.`);
    }

    const tempPassword = generateTempPassword();

    console.log(`Creating auth.users row for ${row.email} (role: ${row.role})...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: row.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        full_name: row.full_name ?? undefined,
        migrated_from: "deposit_users",
        legacy_id: row.id,
      },
    });

    if (createError || !created?.user) {
      console.error(`FAIL  ${row.email} — could not create auth.users row:`, createError);
      results.failed.push({ email: row.email, step: "createUser", error: createError });
      continue;
    }

    const newId = created.user.id;

    console.log(`Repointing deposit_users.id and messages.investor_id: ${row.id} -> ${newId}...`);
    const { error: repointError } = await supabase.rpc("backfill_repoint_user_id", {
      p_old_id: row.id,
      p_new_id: newId,
    });

    if (repointError) {
      console.error(
        `FAIL  ${row.email} — auth.users row was created (id: ${newId}) but repointing failed. ` +
        `You must resolve this manually (either fix and re-run backfill_repoint_user_id for this ` +
        `pair, or delete the orphaned auth.users row via supabase.auth.admin.deleteUser("${newId}") ` +
        `and re-run this script):`,
        repointError
      );
      results.failed.push({ email: row.email, step: "repoint", newId, error: repointError });
      continue;
    }

    console.log(`OK    ${row.email} — old id ${row.id} -> new id ${newId}`);
    console.log(`      Temp password (dev only, for manual login testing): ${tempPassword}`);
    results.migrated.push({ email: row.email, oldId: row.id, newId, tempPassword });
  }

  console.log("\n──────────────────────────────────────────────");
  console.log(`Migrated: ${results.migrated.length}  Skipped: ${results.skipped.length}  Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log("\nFailed rows need manual attention before running migration 004:");
    console.log(JSON.stringify(results.failed, null, 2));
    process.exit(1);
  }
  console.log("\nAll rows processed. Verify with the SQL queries in the handoff message before running migration 004.");
}

main();

// ============================================================================
// PROD DIFFERENCES — read before ever adapting this for the real cutover:
//   - Do NOT print or log the temp password anywhere for real investors.
//     Call supabase.auth.admin.generateLink({ type: 'recovery', email })
//     (or supabase.auth.resetPasswordForEmail) immediately after createUser
//     instead, so the real investor gets a password-reset email and the
//     temp password is never exposed to anyone, including this script's
//     own console output.
//   - Run against a rehearsal clone first (Section D.3 / the Dev -> Prod
//     Migration Checklist in the blueprint), never production directly on
//     the first attempt.
//   - Take a full deposit_users + messages export immediately before
//     running against production, so there's a concrete rollback point.
// ============================================================================
