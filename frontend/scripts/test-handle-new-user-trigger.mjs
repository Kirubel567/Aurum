// One-off, throwaway verification that handle_new_user() actually fires on
// a real new signup (migration 004). Creates a test auth.users row, checks
// that deposit_users + wallets auto-populated, then deletes everything it
// created. Safe to run repeatedly; leaves nothing behind on success or
// failure.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const testEmail = `trigger-test-${Date.now()}@example.com`;

async function main() {
  console.log(`Creating test user: ${testEmail}`);
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: testEmail,
    password: "throwaway-test-password-not-used",
    email_confirm: true,
  });

  if (createError || !created?.user) {
    console.error("FAIL — could not create test auth user:", createError);
    process.exit(1);
  }

  const userId = created.user.id;
  console.log(`Created auth.users row: ${userId}`);

  const { data: profileRow, error: profileError } = await supabase
    .from("deposit_users")
    .select("id, email, role, deposit_status")
    .eq("id", userId)
    .maybeSingle();

  const { data: walletRow, error: walletError } = await supabase
    .from("wallets")
    .select("user_id, currency, balance")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("\n── Results ──");
  console.log("deposit_users row:", profileError ? `ERROR: ${profileError.message}` : JSON.stringify(profileRow));
  console.log("wallets row:      ", walletError ? `ERROR: ${walletError.message}` : JSON.stringify(walletRow));

  const passed = !!profileRow && !!walletRow && Number(walletRow.balance) === 0 && profileRow.role === "investor";

  console.log("\nCleaning up test user...");
  const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error("WARNING: failed to delete test user, clean up manually:", userId, deleteError);
  } else {
    console.log("Test user and cascaded rows deleted (deposit_users/wallets cascade from auth.users deletion).");
  }

  console.log(passed ? "\nPASS — handle_new_user() is firing correctly on new signups." : "\nFAIL — trigger did not provision as expected.");
  process.exit(passed ? 0 : 1);
}

main();
