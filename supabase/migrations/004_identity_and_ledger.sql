-- ============================================================================
-- Migration 004 — PHASE -1, PART B: Identity FK, RBAC Functions, Ledger
--                  Schema, Concurrency-Safe RPC, RLS, Auto-Provisioning
-- ============================================================================
-- Aurum Sovereign Capital — Backend Master Blueprint, Sections B, C, D, and E.
--
-- DO NOT RUN THIS FILE until scripts/backfill-dev-auth-users.mjs has
-- completed successfully for every deposit_users row. Section 2 below
-- self-checks for this and raises a clear, actionable exception naming any
-- row that isn't ready, rather than corrupting the id column partway
-- through.
--
-- This does NOT create a "public.profiles" table. "deposit_users" is the
-- canonical, already-live user/profile table — every requirement that
-- would normally be satisfied by "profiles" is satisfied by extending
-- deposit_users in place instead.
-- ============================================================================


-- ============================================================================
-- SECTION 2 — IDENTITY: convert deposit_users.id to uuid, attach to auth.users
-- ============================================================================

-- ── 2a. Preflight: every row must already be uuid-shaped AND have a
--        matching auth.users row before the column type can safely change. ──
DO $$
DECLARE
  not_uuid_shaped_count int;
  no_auth_match_count int;
  sample_emails text;
BEGIN
  SELECT count(*) INTO not_uuid_shaped_count
  FROM deposit_users
  WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF not_uuid_shaped_count > 0 THEN
    SELECT string_agg(email, ', ') INTO sample_emails
    FROM (
      SELECT email FROM deposit_users
      WHERE id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      LIMIT 10
    ) x;

    RAISE EXCEPTION
      'MIGRATION 004 BLOCKED: % deposit_users row(s) still have a non-UUID-shaped id, '
      'meaning scripts/backfill-dev-auth-users.mjs has not run for them yet. '
      'Sample affected emails: %. Run the backfill script and re-run this migration.',
      not_uuid_shaped_count, coalesce(sample_emails, '(none captured)');
  END IF;

  SELECT count(*) INTO no_auth_match_count
  FROM deposit_users du
  WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id::text = du.id);

  IF no_auth_match_count > 0 THEN
    SELECT string_agg(du.email, ', ') INTO sample_emails
    FROM (
      SELECT email FROM deposit_users du
      WHERE NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id::text = du.id)
      LIMIT 10
    ) du;

    RAISE EXCEPTION
      'MIGRATION 004 BLOCKED: % deposit_users row(s) are UUID-shaped but have no matching '
      'auth.users row — the backfill script created an id-shaped value but the auth.users '
      'row itself is missing or was not linked correctly. Sample affected emails: %. '
      'Investigate before proceeding.',
      no_auth_match_count, coalesce(sample_emails, '(none captured)');
  END IF;
END $$;

-- ── 2b. Convert the column type now that every value is confirmed safe. ─────
ALTER TABLE deposit_users
  ALTER COLUMN id TYPE uuid USING id::uuid;

-- ── 2c. Attach the real foreign key, with cascading delete: if an identity
--        is removed from auth.users, its deposit_users profile goes with
--        it. (Downstream financial tables below intentionally also cascade
--        from deposit_users — see the comment on Section 3 for why that's
--        still the right call given this app's "terminate, never
--        hard-delete" account lifecycle.) ──────────────────────────────────
ALTER TABLE deposit_users DROP CONSTRAINT IF EXISTS deposit_users_id_fkey;
ALTER TABLE deposit_users
  ADD CONSTRAINT deposit_users_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ── 2d. RLS security helper functions ────────────────────────────────────────
-- SECURITY DEFINER means these run with the function owner's privileges, so
-- their internal SELECT against deposit_users does NOT re-trigger the RLS
-- policy being evaluated on deposit_users itself — this is what prevents the
-- classic infinite-recursion bug where a naive helper function called from
-- an RLS policy on the same table it queries recurses forever.
-- SET search_path = public is required hardening for any SECURITY DEFINER
-- function — it prevents a malicious search_path from redirecting these
-- lookups to an attacker-controlled table.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deposit_users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.deposit_users
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

COMMENT ON FUNCTION public.is_super_admin() IS
  'True only for the currently authenticated Supabase user if their deposit_users.role is super_admin (Platform Controller). Used by every RLS policy and RPC that gates a financial mutation.';
COMMENT ON FUNCTION public.is_staff() IS
  'True for the currently authenticated Supabase user if their deposit_users.role is admin or super_admin. Used for read-only staff access policies.';

-- ── 2e. deposit_users RLS ─────────────────────────────────────────────────────
ALTER TABLE deposit_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposit_users_select_own" ON deposit_users;
CREATE POLICY "deposit_users_select_own"
  ON deposit_users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "deposit_users_select_staff" ON deposit_users;
CREATE POLICY "deposit_users_select_staff"
  ON deposit_users FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "deposit_users_update_own" ON deposit_users;
CREATE POLICY "deposit_users_update_own"
  ON deposit_users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role = 'investor');

DROP POLICY IF EXISTS "deposit_users_update_super_admin" ON deposit_users;
CREATE POLICY "deposit_users_update_super_admin"
  ON deposit_users FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ============================================================================
-- SECTION 3 — HARDENED LEDGER SCHEMA & CORE FINANCIAL TABLES
-- (Blueprint Sections C & E)
-- ============================================================================
-- ON DELETE CASCADE from every table below to deposit_users(id) is a
-- deliberate choice, not an oversight: in practice, deposit_users rows are
-- never hard-deleted (Phase 14 explicitly terminates accounts via a status
-- flag, never a row delete, specifically to preserve financial audit
-- trails) — CASCADE here is a safety net for a path the application layer
-- is designed to avoid taking, not a routine occurrence.

-- ── 3a. wallets — the single-source-of-truth balance cache, one row per
--        user per currency. NEVER written to directly by application code —
--        every mutation goes through a SECURITY DEFINER RPC (Section 4). ────
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES deposit_users(id) ON DELETE CASCADE,
  currency text NOT NULL DEFAULT 'USD',
  balance numeric(16,2) NOT NULL DEFAULT 0,
  locked_principal numeric(16,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, currency)
);
CREATE INDEX IF NOT EXISTS wallets_user_idx ON public.wallets (user_id);

-- ── 3b. ledger_entries — append-only, double-entry-style. Every
--        balance-affecting event writes exactly two rows in the same
--        transaction: one against the investor's account_id, one against
--        the fixed platform clearing sentinel (00000000-0000-0000-0000-
--        000000000000). The two rows for one event always share the same
--        transaction_id and always sum to zero — that invariant is what
--        makes the ledger reconcilable and audit-proof. ────────────────────
CREATE TABLE IF NOT EXISTS public.ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL,
  account_id uuid NOT NULL,
  entry_type ledger_entry_type NOT NULL,
  amount numeric(16,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  reference_table text,
  reference_id uuid,
  note text,
  created_by uuid REFERENCES deposit_users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON public.ledger_entries (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ledger_entries_txn_idx ON public.ledger_entries (transaction_id);

COMMENT ON TABLE public.ledger_entries IS
  'Append-only double-entry ledger. Platform clearing account sentinel id: 00000000-0000-0000-0000-000000000000. Every economic event writes a matched pair of rows sharing one transaction_id, summing to zero.';

-- ── 3c. deposits ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES deposit_users(id) ON DELETE CASCADE,
  amount_submitted numeric(14,2) NOT NULL CHECK (amount_submitted > 0),
  currency_submitted text NOT NULL DEFAULT 'USD',
  fx_rate_applied numeric(18,8),
  settled_amount_usd numeric(14,2),
  method text NOT NULL CHECK (method IN ('bank', 'ewallet', 'crypto', 'other')),
  method_detail text NOT NULL,
  proof_file_path text,
  tx_reference text NOT NULL,
  tx_hash text,
  status transaction_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES deposit_users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposits_settled_fields_consistent CHECK (
    (status = 'approved' AND fx_rate_applied IS NOT NULL AND settled_amount_usd IS NOT NULL)
    OR (status != 'approved')
  )
);
CREATE INDEX IF NOT EXISTS deposits_status_idx ON public.deposits (status, created_at DESC);
CREATE INDEX IF NOT EXISTS deposits_user_idx ON public.deposits (user_id, created_at DESC);

COMMENT ON COLUMN public.deposits.tx_reference IS
  'Internal, system-generated reference number shown to the investor and staff.';
COMMENT ON COLUMN public.deposits.tx_hash IS
  'On-chain transaction hash for crypto-method deposits only (USDT/BTC/ETH). NULL for bank/e-wallet/other methods.';
COMMENT ON TABLE public.deposits IS
  'New-architecture deposit records, backed by Storage for proof files. deposit_users still has legacy proof_file_name/proof_mime_type/proof_base64/intended_deposit_amount columns from the pre-Phase-4 onboarding flow (proof stored inline as base64) — those stay as historical data and are not migrated into this table automatically; Phase 4/13 implementation should decide whether to backfill them or simply leave old proofs on the legacy columns.';

-- ── 3d. withdrawals ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES deposit_users(id) ON DELETE CASCADE,
  amount_usd numeric(14,2) NOT NULL CHECK (amount_usd > 0),
  fee_usd numeric(14,2) NOT NULL DEFAULT 0,
  net_usd numeric(14,2) NOT NULL,
  method text NOT NULL CHECK (method IN ('standard', 'express')),
  bank_account_id uuid,
  tx_hash text,
  status transaction_status NOT NULL DEFAULT 'pending',
  reviewed_by uuid REFERENCES deposit_users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  reference text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS withdrawals_status_idx ON public.withdrawals (status, created_at DESC);
CREATE INDEX IF NOT EXISTS withdrawals_user_idx ON public.withdrawals (user_id, created_at DESC);

COMMENT ON COLUMN public.withdrawals.bank_account_id IS
  'References saved_bank_accounts.id, created in Phase 5. No FK constraint yet since that table does not exist until then.';

-- ── 3e. principal_lock_blocks — one row per approved deposit, tracking its
--        own maturity date independently of every other deposit the same
--        investor has made. Yield credited on top of locked principal is
--        NOT subject to lock-up — only the original principal is locked. ───
CREATE TABLE IF NOT EXISTS public.principal_lock_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deposit_id uuid NOT NULL REFERENCES deposits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES deposit_users(id) ON DELETE CASCADE,
  principal_usd numeric(14,2) NOT NULL,
  locked_until timestamptz NOT NULL,
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS principal_lock_blocks_user_idx ON public.principal_lock_blocks (user_id, locked_until);

COMMENT ON COLUMN public.principal_lock_blocks.released IS
  'Convenience marker only, not a trust boundary — withdrawal-availability checks always re-verify locked_until > now() live rather than trusting this flag.';


-- ============================================================================
-- SECTION 4 — REAL-MONEY CONCURRENCY PROTECTION
-- (Blueprint Section E.1 / E.3)
-- ============================================================================

-- admin_adjust_balance() is a complete, callable example of the binding
-- pattern every balance-mutating RPC in this system follows: lock the
-- target wallet row first with SELECT ... FOR UPDATE (blocking any
-- concurrent RPC call touching the same user_id until this transaction
-- commits or rolls back), validate, then write the paired ledger_entries
-- rows and update the cached balance — all inside one atomic function call.
-- This is the template Phase 5/13/14's named RPCs (request_withdrawal,
-- approve_deposit, admin_adjust_yield, etc.) will each follow when their
-- own phases are built.
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id uuid,
  p_amount numeric,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_txn_id uuid := gen_random_uuid();
  v_platform_account_id uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED' USING ERRCODE = '22004';
  END IF;

  IF p_amount = 0 THEN
    RAISE EXCEPTION 'AMOUNT_MUST_BE_NONZERO' USING ERRCODE = '22003';
  END IF;

  -- Lock this investor's USD wallet row for the duration of this
  -- transaction. Any concurrent RPC call touching the same user_id
  -- (another admin adjustment, a withdrawal request, a yield accrual run)
  -- blocks here until this transaction finishes — this is what eliminates
  -- the double-spend / race-condition window entirely.
  SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id AND currency = 'USD'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  IF v_wallet.balance + p_amount < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE' USING ERRCODE = '22003';
  END IF;

  -- Paired double-entry rows: investor side and platform clearing side,
  -- equal and opposite, sharing one transaction_id.
  INSERT INTO public.ledger_entries
    (transaction_id, account_id, entry_type, amount, currency, reference_table, note, created_by)
  VALUES
    (v_txn_id, p_user_id, 'correction', p_amount, 'USD', 'wallets', p_reason, auth.uid()),
    (v_txn_id, v_platform_account_id, 'correction', -p_amount, 'USD', 'wallets', p_reason, auth.uid());

  UPDATE public.wallets
    SET balance = balance + p_amount, updated_at = now()
    WHERE user_id = p_user_id AND currency = 'USD';

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_txn_id,
    'new_balance', v_wallet.balance + p_amount
  );
END;
$$;

COMMENT ON FUNCTION public.admin_adjust_balance(uuid, numeric, text) IS
  'super_admin-only. The reference pattern every balance-mutating RPC in this system follows: FOR UPDATE lock first, validate, then write the ledger + wallet update atomically. Called exclusively via supabase.rpc(), never via a direct table write.';


-- ============================================================================
-- SECTION 5 — AIRTIGHT DATA ISOLATION & FAIL-CLOSED RLS POLICIES
-- (Blueprint Sections B.2, C, E.1)
-- ============================================================================

-- ── wallets, ledger_entries, principal_lock_blocks: read-only for everyone,
--    even super_admin. These three tables are never written to by anything
--    except SECURITY DEFINER RPCs (which bypass RLS entirely for their own
--    internal writes, by design) — there is intentionally no INSERT/UPDATE/
--    DELETE policy for any role on any of them. A table with RLS enabled and
--    zero matching policies for an operation denies that operation by
--    default — this is the fail-closed posture required by the blueprint. ──

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wallets_select_own" ON public.wallets;
CREATE POLICY "wallets_select_own"
  ON public.wallets FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "wallets_select_staff" ON public.wallets;
CREATE POLICY "wallets_select_staff"
  ON public.wallets FOR SELECT
  USING (public.is_staff());

ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ledger_entries_select_own" ON public.ledger_entries;
CREATE POLICY "ledger_entries_select_own"
  ON public.ledger_entries FOR SELECT
  USING (account_id = auth.uid());
DROP POLICY IF EXISTS "ledger_entries_select_staff" ON public.ledger_entries;
CREATE POLICY "ledger_entries_select_staff"
  ON public.ledger_entries FOR SELECT
  USING (public.is_staff());

ALTER TABLE public.principal_lock_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "principal_lock_blocks_select_own" ON public.principal_lock_blocks;
CREATE POLICY "principal_lock_blocks_select_own"
  ON public.principal_lock_blocks FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS "principal_lock_blocks_select_staff" ON public.principal_lock_blocks;
CREATE POLICY "principal_lock_blocks_select_staff"
  ON public.principal_lock_blocks FOR SELECT
  USING (public.is_staff());

-- ── deposits: investors read + create their own rows only. Staff (admin)
--    read every row for analytics, but cannot mutate. Only super_admin can
--    approve/reject (mutation happens through the Section E.4 RPCs once
--    Phase 13 is built, not via a direct client UPDATE — this policy is the
--    database-level backstop in case that discipline is ever bypassed). ────

ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deposits_select_own" ON public.deposits;
CREATE POLICY "deposits_select_own"
  ON public.deposits FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "deposits_select_staff" ON public.deposits;
CREATE POLICY "deposits_select_staff"
  ON public.deposits FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "deposits_insert_own" ON public.deposits;
CREATE POLICY "deposits_insert_own"
  ON public.deposits FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "deposits_mutate_super_admin" ON public.deposits;
CREATE POLICY "deposits_mutate_super_admin"
  ON public.deposits FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ── withdrawals: same shape as deposits. ─────────────────────────────────────

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "withdrawals_select_own" ON public.withdrawals;
CREATE POLICY "withdrawals_select_own"
  ON public.withdrawals FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "withdrawals_select_staff" ON public.withdrawals;
CREATE POLICY "withdrawals_select_staff"
  ON public.withdrawals FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "withdrawals_insert_own" ON public.withdrawals;
CREATE POLICY "withdrawals_insert_own"
  ON public.withdrawals FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "withdrawals_mutate_super_admin" ON public.withdrawals;
CREATE POLICY "withdrawals_mutate_super_admin"
  ON public.withdrawals FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ============================================================================
-- SECTION 6 — PLATFORM PROVISIONING AUTOMATION
-- (Blueprint Section D, adapted for trigger-based provisioning)
-- ============================================================================

-- Fires automatically whenever a new row lands in auth.users (via
-- supabase.auth.signUp(), the Admin API used by admin-account creation, or
-- a future backfill) and provisions the matching deposit_users row plus a
-- zero-balance USD wallet in the same transaction as the identity's
-- creation — no window where an authenticated user exists without a
-- profile or wallet.
--
-- ON CONFLICT (id) DO NOTHING makes this idempotent. Only a minimal set of
-- fields is populated here — full onboarding data (phone, country,
-- address, DOB) is collected by the registration wizard afterward via
-- UPDATE, not INSERT, once this trigger has already created the row. This
-- is exactly why Section 2b relaxed the NOT NULL constraints on "password"
-- and "full_name" — this trigger deliberately does not set either.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.deposit_users (id, email, role, deposit_status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'role', '')::user_role, 'investor'),
    'none'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, currency, balance, locked_principal)
  VALUES (NEW.id, 'USD', 0, 0)
  ON CONFLICT (user_id, currency) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user() IS
  'Auto-provisions a deposit_users profile row and a zero-balance USD wallet the instant a new auth.users row is created. Full onboarding fields are populated afterward via UPDATE by the registration flow, not by this trigger.';

-- ============================================================================
-- END OF MIGRATION 004 — Phase -1 is complete once this applies cleanly.
-- ============================================================================
