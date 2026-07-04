-- ============================================================================
-- Yield accrual — the daily-yield data path behind the investor dashboard.
-- Blueprint: PHASE 1 (yield_accrual_log) + Section E.4 (accrue_daily_yield).
--
-- Writes happen ONLY through accrue_daily_yield() below, called by the
-- scheduled runner (service-role context). No client role can insert.
-- ============================================================================

-- ── 1. yield_accrual_log — one row per investor per day (per pool later) ────
CREATE TABLE IF NOT EXISTS public.yield_accrual_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  period_date date NOT NULL,
  yield_rate numeric(6,4) NOT NULL,       -- daily rate applied, e.g. 0.0032 = 0.32%
  yield_amount_usd numeric(14,2) NOT NULL,
  strategy_pool_id uuid,                  -- references strategy_pools.id (Phase 2); no FK until that table exists
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Postgres treats NULLs as distinct in plain UNIQUE constraints, and
-- strategy_pool_id stays NULL until Phase 2 — so the pre-pool uniqueness
-- guarantee (one accrual per investor per day) needs a partial index, and
-- the per-pool guarantee its own index for when pools arrive.
CREATE UNIQUE INDEX IF NOT EXISTS yield_accrual_user_day_nopool_idx
  ON public.yield_accrual_log (user_id, period_date)
  WHERE strategy_pool_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS yield_accrual_user_day_pool_idx
  ON public.yield_accrual_log (user_id, period_date, strategy_pool_id)
  WHERE strategy_pool_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS yield_accrual_user_idx
  ON public.yield_accrual_log (user_id, period_date DESC);

ALTER TABLE public.yield_accrual_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "yield_accrual_select_own" ON public.yield_accrual_log;
CREATE POLICY "yield_accrual_select_own"
  ON public.yield_accrual_log FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "yield_accrual_select_staff" ON public.yield_accrual_log;
CREATE POLICY "yield_accrual_select_staff"
  ON public.yield_accrual_log FOR SELECT
  USING (public.is_staff());

COMMENT ON TABLE public.yield_accrual_log IS
  'Daily yield accruals per investor (per strategy pool from Phase 2 on). Written exclusively by accrue_daily_yield() — no client insert policy by design.';

-- ── 2. accrue_daily_yield() — Section E.4 contract ──────────────────────────
-- Follows the binding admin_adjust_balance() pattern from migration 004:
-- FOR UPDATE lock first, validate, then log + paired ledger entries + cached
-- balance update, all in one atomic call.
--
-- Caller: the scheduled runner only (service role bypasses RLS; the explicit
-- guard below also admits a logged-in super_admin for manual runs).
CREATE OR REPLACE FUNCTION public.accrue_daily_yield(
  p_user_id uuid,
  p_period_date date,
  p_yield_rate numeric,
  p_strategy_pool_id uuid DEFAULT NULL
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
  v_yield_amount numeric(14,2);
BEGIN
  -- Service-role calls run with auth.uid() IS NULL; a logged-in super_admin
  -- may also trigger a manual accrual. Nobody else.
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'SERVICE_OR_SUPER_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF p_yield_rate <= 0 OR p_yield_rate >= 1 THEN
    RAISE EXCEPTION 'YIELD_RATE_OUT_OF_RANGE' USING ERRCODE = '22003';
  END IF;

  -- Idempotency: one accrual per investor per day (per pool). A re-run of
  -- the daily job must be a no-op, not a double credit.
  IF EXISTS (
    SELECT 1 FROM public.yield_accrual_log
    WHERE user_id = p_user_id
      AND period_date = p_period_date
      AND strategy_pool_id IS NOT DISTINCT FROM p_strategy_pool_id
  ) THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'already_accrued');
  END IF;

  SELECT * INTO v_wallet
    FROM public.wallets
    WHERE user_id = p_user_id AND currency = 'USD'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;

  -- Nothing to accrue on an empty wallet — skip silently so the runner
  -- doesn't error on brand-new accounts.
  IF v_wallet.balance <= 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'zero_balance');
  END IF;

  v_yield_amount := round(v_wallet.balance * p_yield_rate, 2);
  IF v_yield_amount <= 0 THEN
    RETURN jsonb_build_object('success', true, 'skipped', 'rounds_to_zero');
  END IF;

  INSERT INTO public.yield_accrual_log
    (user_id, period_date, yield_rate, yield_amount_usd, strategy_pool_id)
  VALUES
    (p_user_id, p_period_date, p_yield_rate, v_yield_amount, p_strategy_pool_id);

  INSERT INTO public.ledger_entries
    (transaction_id, account_id, entry_type, amount, currency, reference_table, note, created_by)
  VALUES
    (v_txn_id, p_user_id, 'interest_credit', v_yield_amount, 'USD', 'yield_accrual_log',
     'Daily yield ' || p_period_date, auth.uid()),
    (v_txn_id, v_platform_account_id, 'interest_credit', -v_yield_amount, 'USD', 'yield_accrual_log',
     'Daily yield ' || p_period_date, auth.uid());

  UPDATE public.wallets
    SET balance = balance + v_yield_amount, updated_at = now()
    WHERE user_id = p_user_id AND currency = 'USD';

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_txn_id,
    'yield_amount', v_yield_amount,
    'new_balance', v_wallet.balance + v_yield_amount
  );
END;
$$;

COMMENT ON FUNCTION public.accrue_daily_yield(uuid, date, numeric, uuid) IS
  'Section E.4 contract. Credits one day of yield: FOR UPDATE wallet lock, idempotency check (re-runs are no-ops), yield_accrual_log insert, paired interest_credit ledger rows, cached balance update — atomically. Called by the scheduled runner (service role) or a super_admin.';
