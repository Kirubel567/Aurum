-- ============================================================================
-- Account-manager targeted trades — pulled forward from Phase 14 at the
-- user's explicit request. Lets an `admin` (Account Manager) open trades
-- for only the investors assigned to them; `super_admin` keeps the existing
-- pool-wide broadcast plus the ability to target any single investor too.
-- ============================================================================

-- ── 1. account_manager_assignments (Phase 14 schema, built early) ──────────
CREATE TABLE IF NOT EXISTS public.account_manager_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id uuid NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES public.deposit_users(id),
  assigned_by uuid NOT NULL REFERENCES public.deposit_users(id),
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (investor_id) -- one active manager per investor at a time
);
CREATE INDEX IF NOT EXISTS account_manager_assignments_admin_idx
  ON public.account_manager_assignments (admin_id);

ALTER TABLE public.account_manager_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "assignments_select_staff" ON public.account_manager_assignments;
CREATE POLICY "assignments_select_staff"
  ON public.account_manager_assignments FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "assignments_select_own" ON public.account_manager_assignments;
CREATE POLICY "assignments_select_own"
  ON public.account_manager_assignments FOR SELECT
  USING (investor_id = auth.uid());

-- Per Phase 14's spec: assignment is not a balance-affecting table, so it
-- allows direct super_admin INSERT/UPDATE/DELETE (no RPC/lock needed).
DROP POLICY IF EXISTS "assignments_write_super_admin" ON public.account_manager_assignments;
CREATE POLICY "assignments_write_super_admin"
  ON public.account_manager_assignments FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

COMMENT ON TABLE public.account_manager_assignments IS
  'Phase 14 schema, built early (Phase 11 follow-up) to support account-manager-targeted trades. One active manager per investor.';

-- ── 2. trade_executions.target_investor_id ──────────────────────────────────
-- NULL = pool-wide broadcast (existing behavior, unchanged). Set = this
-- trade belongs to exactly one investor, bypassing the pool allocation
-- fan-out entirely on close.
ALTER TABLE public.trade_executions
  ADD COLUMN IF NOT EXISTS target_investor_id uuid REFERENCES public.deposit_users(id);
CREATE INDEX IF NOT EXISTS trade_executions_target_investor_idx
  ON public.trade_executions (target_investor_id) WHERE target_investor_id IS NOT NULL;

COMMENT ON COLUMN public.trade_executions.target_investor_id IS
  'NULL = pool-wide broadcast, fanned out via investor_pool_allocations on close. Non-NULL = single-investor targeted trade (opened by their assigned account manager or by super_admin); close_trade_execution() credits 100% to this investor only.';

-- ── 3. close_trade_execution() — targeted branch added ──────────────────────
-- Same signature and pool-broadcast behavior as migration 008; adds an
-- early branch for target_investor_id IS NOT NULL that credits exactly one
-- wallet, skipping the allocation-weighted loop entirely.
CREATE OR REPLACE FUNCTION public.close_trade_execution(
  p_execution_id uuid,
  p_close_price numeric,
  p_realized_pl_usd numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution public.trade_executions%ROWTYPE;
  v_alloc record;
  v_wallet public.wallets%ROWTYPE;
  v_share numeric(14,2);
  v_total_pct numeric;
  v_txn_id uuid;
  v_platform_account_id uuid := '00000000-0000-0000-0000-000000000000';
  v_credited int := 0;
  v_distributed numeric(14,2) := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() AND NOT public.is_staff() THEN
    RAISE EXCEPTION 'SERVICE_OR_STAFF_REQUIRED' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_execution
    FROM public.trade_executions
    WHERE id = p_execution_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'EXECUTION_NOT_FOUND' USING ERRCODE = 'P0002';
  END IF;
  IF v_execution.status = 'closed' THEN
    RAISE EXCEPTION 'ALREADY_CLOSED' USING ERRCODE = '22023';
  END IF;

  -- An admin (non-super_admin) closing a trade may only close one they
  -- targeted at their own assigned investor — never a pool broadcast, and
  -- never another manager's targeted trade. super_admin can close anything.
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    IF v_execution.target_investor_id IS NULL THEN
      RAISE EXCEPTION 'SUPER_ADMIN_REQUIRED_FOR_BROADCAST' USING ERRCODE = '42501';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.account_manager_assignments
      WHERE investor_id = v_execution.target_investor_id AND admin_id = auth.uid()
    ) THEN
      RAISE EXCEPTION 'NOT_YOUR_ASSIGNED_INVESTOR' USING ERRCODE = '42501';
    END IF;
  END IF;

  UPDATE public.trade_executions
    SET status = 'closed',
        current_price = p_close_price,
        realized_pl_usd = p_realized_pl_usd,
        closed_at = now()
    WHERE id = p_execution_id;

  IF v_execution.target_investor_id IS NOT NULL THEN
    -- ── Targeted branch: 100% to the one named investor ──────────────────
    IF p_realized_pl_usd != 0 THEN
      SELECT * INTO v_wallet
        FROM public.wallets
        WHERE user_id = v_execution.target_investor_id AND currency = 'USD'
        FOR UPDATE;

      IF FOUND THEN
        v_share := p_realized_pl_usd;
        IF v_wallet.balance + v_share < 0 THEN
          v_share := -v_wallet.balance;
        END IF;

        IF v_share != 0 THEN
          v_txn_id := gen_random_uuid();
          INSERT INTO public.ledger_entries
            (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
          VALUES
            (v_txn_id, v_execution.target_investor_id, 'trade_pl', v_share, 'USD', 'trade_executions', p_execution_id,
             'Targeted trade P/L: ' || v_execution.asset_pair, auth.uid()),
            (v_txn_id, v_platform_account_id, 'trade_pl', -v_share, 'USD', 'trade_executions', p_execution_id,
             'Targeted trade P/L: ' || v_execution.asset_pair, auth.uid());

          UPDATE public.wallets
            SET balance = balance + v_share, updated_at = now()
            WHERE user_id = v_execution.target_investor_id AND currency = 'USD';

          v_credited := 1;
          v_distributed := v_share;
        END IF;
      END IF;
    END IF;

    RETURN jsonb_build_object(
      'success', true, 'execution_id', p_execution_id, 'realized_pl_usd', p_realized_pl_usd,
      'investors_credited', v_credited, 'total_distributed', v_distributed, 'targeted', true
    );
  END IF;

  -- ── Pool-wide branch: unchanged from migration 008 ──────────────────────
  SELECT COALESCE(SUM(allocation_pct), 0) INTO v_total_pct
    FROM public.investor_pool_allocations
    WHERE strategy_pool_id = v_execution.strategy_pool_id;

  IF v_total_pct > 0 AND p_realized_pl_usd != 0 THEN
    FOR v_alloc IN
      SELECT user_id, allocation_pct
        FROM public.investor_pool_allocations
        WHERE strategy_pool_id = v_execution.strategy_pool_id
        ORDER BY user_id
    LOOP
      v_share := round(p_realized_pl_usd * (v_alloc.allocation_pct / v_total_pct), 2);
      IF v_share = 0 THEN CONTINUE; END IF;

      SELECT * INTO v_wallet
        FROM public.wallets
        WHERE user_id = v_alloc.user_id AND currency = 'USD'
        FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;

      IF v_wallet.balance + v_share < 0 THEN
        v_share := -v_wallet.balance;
        IF v_share = 0 THEN CONTINUE; END IF;
      END IF;

      v_txn_id := gen_random_uuid();
      INSERT INTO public.ledger_entries
        (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
      VALUES
        (v_txn_id, v_alloc.user_id, 'trade_pl', v_share, 'USD', 'trade_executions', p_execution_id,
         'Trade P/L: ' || v_execution.asset_pair, auth.uid()),
        (v_txn_id, v_platform_account_id, 'trade_pl', -v_share, 'USD', 'trade_executions', p_execution_id,
         'Trade P/L: ' || v_execution.asset_pair, auth.uid());

      UPDATE public.wallets
        SET balance = balance + v_share, updated_at = now()
        WHERE user_id = v_alloc.user_id AND currency = 'USD';

      v_credited := v_credited + 1;
      v_distributed := v_distributed + v_share;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'execution_id', p_execution_id, 'realized_pl_usd', p_realized_pl_usd,
    'investors_credited', v_credited, 'total_distributed', v_distributed, 'targeted', false
  );
END;
$$;

COMMENT ON FUNCTION public.close_trade_execution(uuid, numeric, numeric) IS
  'Section E.4 contract, extended for account-manager targeting. target_investor_id IS NULL: pool-wide fan-out weighted by investor_pool_allocations (migration 008 behavior, unchanged). target_investor_id set: credits that one investor 100%, and only their assigned account manager (or super_admin) may close it.';

-- ── 4. RLS: investors also see trades targeted at them personally ──────────
DROP POLICY IF EXISTS "trade_executions_select_authenticated" ON public.trade_executions;
CREATE POLICY "trade_executions_select_authenticated"
  ON public.trade_executions FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (target_investor_id IS NULL OR target_investor_id = auth.uid() OR public.is_staff())
  );
