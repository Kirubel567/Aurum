#!/usr/bin/env node
// verify-phase8.mjs — Phase 8 smoke tests (Legal Documents)
// Run: node --require dotenv/config scripts/verify-phase8.mjs dotenv_config_path=.env.local
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
let ws;
try { ws = require("ws"); } catch { ws = undefined; }

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL_ || !KEY) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

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

console.log("\n── Phase 8: Legal Documents ──\n");

// 1. legal_documents table exists
await test("legal_documents table exists", async () => {
  const { error } = await db.from("legal_documents").select("id").limit(1);
  if (error) throw new Error(error.message);
});

// 2. legal_documents has required columns
await test("legal_documents has required columns", async () => {
  const { error } = await db
    .from("legal_documents")
    .select("id, title, doc_type, description, storage_path, assigned_to, uploaded_by, is_read, read_at, created_at")
    .limit(1);
  if (error) throw new Error(error.message);
});

// 3. doc_type CHECK constraint rejects invalid values
await test("doc_type CHECK rejects invalid value", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) { console.log("    (skipped — no users)"); return; }
  const { error } = await db.from("legal_documents").insert({
    title: "test",
    doc_type: "invalid_type",
    storage_path: "test/test.pdf",
    assigned_to: user.id,
  });
  if (!error) throw new Error("CHECK constraint did not reject invalid doc_type");
});

// 4. Full insert/read/delete cycle
await test("insert and delete legal_document cycle", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) { console.log("    (skipped — no users)"); return; }

  const { data: doc, error: insertErr } = await db
    .from("legal_documents")
    .insert({
      title: "verify-phase8 test doc",
      doc_type: "agreement",
      description: "smoke test",
      storage_path: "test/verify-phase8.pdf",
      assigned_to: user.id,
    })
    .select("id")
    .single();

  if (insertErr) throw new Error(insertErr.message);

  // Mark as read
  const { error: readErr } = await db
    .from("legal_documents")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", doc.id);
  if (readErr) throw new Error("Failed to update is_read: " + readErr.message);

  // Verify read flag
  const { data: check } = await db.from("legal_documents").select("is_read").eq("id", doc.id).single();
  if (!check?.is_read) throw new Error("is_read was not set to true");

  // Cleanup
  await db.from("legal_documents").delete().eq("id", doc.id);
});

// 5. Notifications table accepts document_assigned type
await test("notifications accepts document_assigned type", async () => {
  const { data: user } = await db.from("deposit_users").select("id").limit(1).single();
  if (!user) { console.log("    (skipped — no users)"); return; }

  const { data: notif, error } = await db
    .from("notifications")
    .insert({
      user_id: user.id,
      type: "document_assigned",
      title: "verify-phase8 test notification",
      body: "Test notification for legal doc assignment.",
      read: false,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  await db.from("notifications").delete().eq("id", notif.id);
});

// 6. Investor API route file exists
await test("GET /api/legal/documents route file exists", async () => {
  const fs = await import("fs");
  const path = "src/app/api/legal/documents/route.ts";
  if (!fs.existsSync(path)) throw new Error(`${path} not found`);
});

// 7. Download route file exists
await test("GET /api/legal/documents/[id]/download route file exists", async () => {
  const fs = await import("fs");
  const path = "src/app/api/legal/documents/[id]/download/route.ts";
  if (!fs.existsSync(path)) throw new Error(`${path} not found`);
});

// 8. Read route file exists
await test("PATCH /api/legal/documents/[id]/read route file exists", async () => {
  const fs = await import("fs");
  const path = "src/app/api/legal/documents/[id]/read/route.ts";
  if (!fs.existsSync(path)) throw new Error(`${path} not found`);
});

// 9. Admin route files exist
await test("Admin /api/admin/legal route files exist", async () => {
  const fs = await import("fs");
  const paths = ["src/app/api/admin/legal/route.ts", "src/app/api/admin/legal/[id]/route.ts"];
  for (const p of paths) {
    if (!fs.existsSync(p)) throw new Error(`${p} not found`);
  }
});

// 10. Admin legal page exists
await test("Admin legal management page exists", async () => {
  const fs = await import("fs");
  const path = "src/app/(admin)/admin/legal/page.tsx";
  if (!fs.existsSync(path)) throw new Error(`${path} not found`);
});

// 11. ADMIN_LEGAL route constant exists
await test("ADMIN_LEGAL route constant is defined", async () => {
  const fs = await import("fs");
  const content = fs.readFileSync("src/lib/constants/routes.ts", "utf8");
  if (!content.includes("ADMIN_LEGAL")) throw new Error("ADMIN_LEGAL missing from routes.ts");
});

// 12. Legal Documents in admin nav
await test("Legal Documents in admin navigation", async () => {
  const fs = await import("fs");
  const content = fs.readFileSync("src/lib/constants/navigation.ts", "utf8");
  if (!content.includes("Legal Documents")) throw new Error("Legal Documents missing from ADMIN_NAV");
});

console.log("\n  Note: Storage bucket 'legal-documents' must be created manually in the");
console.log("  Supabase dashboard (Storage → New bucket → private) before uploads work.");
console.log(`\n── Results: ${passed} passed, ${failed} failed ──\n`);
if (failed > 0) process.exit(1);
