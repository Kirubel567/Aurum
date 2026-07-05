-- ============================================================================
-- Migration 013 — PHASE 4 + 13: Deposit Pipeline
--   - system_settings singleton (lockup period, min deposit, fee rates)
--   - metadata column on deposits (third-party sender info)
--   - approve_deposit() RPC  (atomic: lock, stamp, ledger, wallet, lock-block,
--                             first-deposit status flip, default pool allocs)
--   - reject_deposit() RPC
--   - RLS for system_settings
--   - Legacy inline-proof backfill (idempotent DO block)
--
-- deposits, principal_lock_blocks, withdrawals tables were already created
-- in migration 004. This file only adds what Phase 4/13 specifically needs
-- on top of that foundation.
-- ============================================================================


-- ============================================================================
-- 1. system_settings — singleton row, one per platform
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id                           int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  min_deposit_usd              numeric(14,2) NOT NULL DEFAULT 1350,
  min_withdrawal_usd           numeric(14,2) NOT NULL DEFAULT 500,
  standard_withdrawal_fee_pct  numeric(5,4)  NOT NULL DEFAULT 0.005,
  express_withdrawal_fee_pct   numeric(5,4)  NOT NULL DEFAULT 0.010,
  lockup_period_days           int           NOT NULL DEFAULT 90,
  updated_at                   timestamptz   NOT NULL DEFAULT now(),
  updated_by                   uuid REFERENCES public.deposit_users(id)
);

COMMENT ON TABLE public.system_settings IS
  'Singleton platform-wide configuration row (always id = 1). Phase 16 adds a super_admin management UI for these values. Until then they are set by migration default or direct DB update.';

INSERT INTO public.system_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Any authenticated user may read (investors need min_deposit_usd, fee rates for display)
DROP POLICY IF EXISTS "system_settings_select_authenticated" ON public.system_settings;
CREATE POLICY "system_settings_select_authenticated"
  ON public.system_settings FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only super_admin may update
DROP POLICY IF EXISTS "system_settings_update_super_admin" ON public.system_settings;
CREATE POLICY "system_settings_update_super_admin"
  ON public.system_settings FOR UPDATE
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());


-- ============================================================================
-- 2. deposits — add metadata column for third-party sender info
-- ============================================================================

ALTER TABLE public.deposits
  ADD COLUMN IF NOT EXISTS metadata jsonb;

COMMENT ON COLUMN public.deposits.metadata IS
  'Optional JSON blob for compliance info not in typed columns, e.g. {"paymentSource":"other","thirdPartyName":"Jane Doe","thirdPartyRelation":"spouse"}.';


-- ============================================================================
-- 3. approve_deposit() RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_deposit(
  p_deposit_id  uuid,
  p_reviewed_by uuid,
  p_fx_rate     numeric DEFAULT 1.0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit          public.deposits%ROWTYPE;
  v_settings         public.system_settings%ROWTYPE;
  v_settled_usd      numeric(14,2);
  v_txn_id           uuid := gen_random_uuid();
  v_platform         uuid := '00000000-0000-0000-0000-000000000000';
  v_is_first_deposit boolean;
BEGIN
  -- ── Validate inputs ──────────────────────────────────────────────────────
  IF p_fx_rate IS NULL OR p_fx_rate <= 0 THEN
    RAISE EXCEPTION 'INVALID_FX_RATE: must be a positive number, got %', p_fx_rate
      USING ERRCODE = '22003';
  END IF;

  -- ── Fetch + lock deposit row ─────────────────────────────────────────────
  SELECT * INTO v_deposit
  FROM public.deposits
  WHERE id = p_deposit_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_deposit.status != 'pending' THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_PENDING: current status is %', v_deposit.status
      USING ERRCODE = '23514';
  END IF;

  -- ── Platform settings ────────────────────────────────────────────────────
  SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;

  -- ── Compute and validate settled USD amount ──────────────────────────────
  v_settled_usd := ROUND(v_deposit.amount_submitted * p_fx_rate, 2);
  IF v_settled_usd < v_settings.min_deposit_usd THEN
    RAISE EXCEPTION 'BELOW_MINIMUM_DEPOSIT: settled $% is below required minimum $%',
      v_settled_usd, v_settings.min_deposit_usd
      USING ERRCODE = '23514';
  END IF;

  -- ── Lock investor's USD wallet (blocks concurrent balance mutations) ─────
  PERFORM id FROM public.wallets
  WHERE user_id = v_deposit.user_id AND currency = 'USD'
  FOR UPDATE;

  -- ── Stamp deposit as approved ────────────────────────────────────────────
  UPDATE public.deposits SET
    status             = 'approved',
    fx_rate_applied    = p_fx_rate,
    settled_amount_usd = v_settled_usd,
    reviewed_by        = p_reviewed_by,
    reviewed_at        = now()
  WHERE id = p_deposit_id;

  -- ── Paired double-entry ledger rows ─────────────────────────────────────
  -- Investor credit (+): deposit received, credited to investor account
  -- Platform debit (−): balancing entry against the clearing sentinel
  INSERT INTO public.ledger_entries
    (transaction_id, account_id, entry_type, amount, currency,
     reference_table, reference_id, note, created_by)
  VALUES
    (v_txn_id, v_deposit.user_id, 'deposit', v_settled_usd, 'USD',
     'deposits', p_deposit_id, 'Deposit approved', p_reviewed_by),
    (v_txn_id, v_platform, 'deposit', -v_settled_usd, 'USD',
     'deposits', p_deposit_id, 'Deposit approved', p_reviewed_by);

  -- ── Update wallet balance ────────────────────────────────────────────────
  UPDATE public.wallets
  SET balance    = balance + v_settled_usd,
      updated_at = now()
  WHERE user_id = v_deposit.user_id AND currency = 'USD';

  -- ── Principal lock block (one per deposit, its own maturity date) ────────
  INSERT INTO public.principal_lock_blocks
    (deposit_id, user_id, principal_usd, locked_until)
  VALUES
    (p_deposit_id, v_deposit.user_id, v_settled_usd,
     now() + (v_settings.lockup_period_days || ' days')::interval);

  -- ── First-deposit side-effects ───────────────────────────────────────────
  -- Check before updating deposit_users so the flag is accurate
  v_is_first_deposit := NOT EXISTS (
    SELECT 1 FROM public.investor_pool_allocations
    WHERE user_id = v_deposit.user_id
  );

  -- Flip deposit_status → 'approved' only if not already (re-deposits leave it alone)
  UPDATE public.deposit_users
  SET deposit_status = 'approved'
  WHERE id = v_deposit.user_id
    AND deposit_status != 'approved';

  -- Default pool allocations for brand-new investors (Forex 40 / Commodities 30 / Indices 30)
  IF v_is_first_deposit THEN
    INSERT INTO public.investor_pool_allocations (user_id, strategy_pool_id, allocation_pct)
    SELECT
      v_deposit.user_id,
      id,
      CASE name
        WHEN 'Forex Majors'   THEN 40
        WHEN 'Commodities'    THEN 30
        WHEN 'Global Indices' THEN 30
      END
    FROM public.strategy_pools
    WHERE name IN ('Forex Majors', 'Commodities', 'Global Indices')
      AND active = true
    ON CONFLICT (user_id, strategy_pool_id) DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success',            true,
    'settled_amount_usd', v_settled_usd,
    'fx_rate_applied',    p_fx_rate,
    'transaction_id',     v_txn_id,
    'first_deposit',      v_is_first_deposit
  );
END;
$$;

COMMENT ON FUNCTION public.approve_deposit(uuid, uuid, numeric) IS
  'Phase 13. Atomically approves a pending deposit: locks wallet, stamps fx_rate/settled_amount, writes paired ledger rows, credits wallet, creates principal_lock_block, flips deposit_status to approved on first deposit, seeds default pool allocations for new investors. Called via service-role only — p_reviewed_by carries the super_admin user_id since auth.uid() is null in that call path.';


-- ============================================================================
-- 4. reject_deposit() RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reject_deposit(
  p_deposit_id  uuid,
  p_reviewed_by uuid,
  p_reason      text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deposit public.deposits%ROWTYPE;
BEGIN
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'REASON_REQUIRED: rejection_reason must not be empty'
      USING ERRCODE = '22004';
  END IF;

  SELECT * INTO v_deposit FROM public.deposits
  WHERE id = p_deposit_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_deposit.status != 'pending' THEN
    RAISE EXCEPTION 'DEPOSIT_NOT_PENDING: current status is %', v_deposit.status
      USING ERRCODE = '23514';
  END IF;

  -- No wallet/ledger touch — a pending deposit never credited anything
  UPDATE public.deposits SET
    status           = 'rejected',
    rejection_reason = p_reason,
    reviewed_by      = p_reviewed_by,
    reviewed_at      = now()
  WHERE id = p_deposit_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

COMMENT ON FUNCTION public.reject_deposit(uuid, uuid, text) IS
  'Phase 13. Rejects a pending deposit. No wallet or ledger changes — a pending deposit never credited the investor. Requires a non-empty rejection_reason.';


-- ============================================================================
-- 5. Legacy inline-proof backfill (idempotent)
-- ============================================================================
-- Creates a deposits row for every deposit_users row that submitted a proof
-- via the old onboarding flow (proof_base64 IS NOT NULL or intended_deposit_amount
-- IS NOT NULL) but has no matching deposits row yet.
--
-- IMPORTANT — what this does NOT do:
--   - Does NOT retroactively credit wallets (those were credited manually via
--     admin_adjust_balance; doing it again would double-credit).
--   - Does NOT create principal_lock_blocks for legacy approved deposits
--     (those will be addressed when Phase 5 is implemented; for now,
--     withdrawal availability for legacy investors is: full balance, no lock).
--   - Does NOT upload the base64 proof to Storage (proof_file_path = NULL for
--     legacy rows; the original base64 remains on deposit_users for reference).
-- ============================================================================

DO $$
BEGIN
  INSERT INTO public.deposits (
    user_id,
    amount_submitted,
    currency_submitted,
    fx_rate_applied,
    settled_amount_usd,
    method,
    method_detail,
    proof_file_path,
    tx_reference,
    status,
    reviewed_by,
    reviewed_at,
    rejection_reason,
    metadata
  )
  SELECT
    du.id,
    COALESCE(du.intended_deposit_amount, 1350)::numeric(14,2),
    'USD',
    -- For approved legacy rows: fx_rate = 1.0, settled = submitted amount
    CASE WHEN du.deposit_status = 'approved' THEN 1.0       ELSE NULL END,
    CASE WHEN du.deposit_status = 'approved'
         THEN COALESCE(du.intended_deposit_amount, 1350)::numeric(14,2)
         ELSE NULL
    END,
    'other',
    'legacy',
    NULL,   -- no Storage path; base64 blob remains on deposit_users
    'AUR-LEGACY-' || UPPER(LEFT(du.id::text, 8)),
    CASE du.deposit_status
      WHEN 'approved' THEN 'approved'::transaction_status
      WHEN 'rejected' THEN 'rejected'::transaction_status
      ELSE                 'pending'::transaction_status
    END,
    NULL,   -- reviewed_by unknown for legacy email-link approvals
    CASE WHEN du.deposit_status IN ('approved', 'rejected') THEN now() ELSE NULL END,
    NULL,
    jsonb_build_object('source', 'legacy_onboarding_backfill')
  FROM public.deposit_users du
  WHERE
    -- Only rows that actually went through the old submission flow
    (du.intended_deposit_amount IS NOT NULL OR du.proof_base64 IS NOT NULL)
    -- Skip rows that already have a deposits entry (idempotency)
    AND NOT EXISTS (
      SELECT 1 FROM public.deposits d WHERE d.user_id = du.id
    );

  RAISE NOTICE 'Legacy deposit backfill complete: % rows inserted',
    (SELECT COUNT(*) FROM public.deposits WHERE metadata->>'source' = 'legacy_onboarding_backfill');
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Legacy deposit backfill skipped: %', SQLERRM;
END $$;

-- ============================================================================
-- END OF MIGRATION 013
-- ============================================================================
