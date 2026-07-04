-- ============================================================================
-- Trading console — the admin-side write path for trade_executions.
-- Blueprint: PHASE 11 + Section E.4 (close_trade_execution).
-- ============================================================================

-- ── 1. manual_trade_adjustments — audit trail for every console action ──────
CREATE TABLE IF NOT EXISTS public.manual_trade_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_execution_id uuid REFERENCES public.trade_executions(id),
  adjusted_by uuid NOT NULL REFERENCES public.deposit_users(id),
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('open','close','price_update','cancel')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS manual_trade_adjustments_execution_idx
  ON public.manual_trade_adjustments (trade_execution_id, created_at DESC);

ALTER TABLE public.manual_trade_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manual_trade_adjustments_select_staff" ON public.manual_trade_adjustments;
CREATE POLICY "manual_trade_adjustments_select_staff"
  ON public.manual_trade_adjustments FOR SELECT
  USING (public.is_staff());
-- No client-side write policies: inserts happen in the super_admin-guarded
-- console routes (service role) alongside the execution mutation.

-- ── 2. close_trade_execution() — Section E.4 contract ────────────────────────
-- Closes one execution and fans its realized P/L into every investor
-- allocated to the pool, proportional to allocation_pct: per investor a
-- FOR UPDATE wallet lock, paired 'trade_pl' ledger rows, balance update —
-- the whole loop inside this one function's transaction, so a partial
-- fan-out can never happen.
--
-- p_realized_pl_usd is the POOL-LEVEL total P/L for this trade (positive =
-- profit distributed to investors, negative = loss deducted). Since the
-- schema tracks no position size, the closing super_admin states the dollar
-- amount explicitly rather than the function deriving it from prices.
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
  -- Service-role calls (auth.uid() NULL) or a logged-in super_admin only.
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'SERVICE_OR_SUPER_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  -- Lock the execution row itself so two concurrent closes can't both run.
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

  UPDATE public.trade_executions
    SET status = 'closed',
        current_price = p_close_price,
        realized_pl_usd = p_realized_pl_usd,
        closed_at = now()
    WHERE id = p_execution_id;

  -- Fan the P/L out over the pool's investors, weighted by allocation_pct.
  -- Weights are normalized against the pool's own total so partial
  -- allocation coverage still distributes exactly p_realized_pl_usd.
  SELECT COALESCE(SUM(allocation_pct), 0) INTO v_total_pct
    FROM public.investor_pool_allocations
    WHERE strategy_pool_id = v_execution.strategy_pool_id;

  IF v_total_pct > 0 AND p_realized_pl_usd != 0 THEN
    FOR v_alloc IN
      SELECT user_id, allocation_pct
        FROM public.investor_pool_allocations
        WHERE strategy_pool_id = v_execution.strategy_pool_id
        ORDER BY user_id -- deterministic lock order prevents deadlocks between concurrent closes
    LOOP
      v_share := round(p_realized_pl_usd * (v_alloc.allocation_pct / v_total_pct), 2);
      IF v_share = 0 THEN CONTINUE; END IF;

      SELECT * INTO v_wallet
        FROM public.wallets
        WHERE user_id = v_alloc.user_id AND currency = 'USD'
        FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;

      -- A loss can't take a wallet below zero — cap the deduction.
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
    'success', true,
    'execution_id', p_execution_id,
    'realized_pl_usd', p_realized_pl_usd,
    'investors_credited', v_credited,
    'total_distributed', v_distributed
  );
END;
$$;

COMMENT ON FUNCTION public.close_trade_execution(uuid, numeric, numeric) IS
  'Section E.4 contract. Closes an execution and distributes its stated pool-level P/L across investor_pool_allocations (normalized weights) — per investor: FOR UPDATE wallet lock, paired trade_pl ledger rows, balance update. Entire fan-out is one transaction. Service role or super_admin only.';
