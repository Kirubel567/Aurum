-- Migration 023: Remove the pool-allocation system
--
-- Business model clarification: Aurum does not run a shared/pooled fund
-- where many investors' capital is commingled and a trade's P/L is divided
-- proportionally by allocation percentage. Each investor's capital is
-- managed individually — the SAME trade is applied to every investor at
-- the SAME dollar result (their starting capital is uniform), OR an
-- account manager opens a trade for one specifically assigned investor.
--
-- strategy_pools stays as a pure CATEGORIZATION label (Forex Majors /
-- Commodities / Global Indices) tagging what kind of trade was taken — it
-- carries no money-allocation meaning anymore. Existing dashboard/liquidity
-- UI cards are repurposed (in application code) to show "% of trades taken
-- in this category" instead of "% of capital allocated to this pool."
--
-- Removed entirely: investor_pool_allocations table, the auto-allocation
-- block in approve_deposit(), and target_allocation_pct on strategy_pools.
--
-- Changed: close_trade_execution() no longer fans P/L out across a pool by
-- allocation_pct. Instead:
--   - targeted trade (target_investor_id set)  → that ONE investor gets the
--     full p_realized_pl_usd, nobody else.
--   - broadcast trade (target_investor_id NULL) → EVERY approved investor
--     gets the SAME p_realized_pl_usd (not divided — each investor's
--     account independently experiences the identical trade result).

-- ── 1. approve_deposit — drop the first-deposit auto-allocation block ────────
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
  v_wallet           public.wallets%ROWTYPE;
  v_settled_usd      numeric(14,2);
  v_available_now    numeric(14,2);
  v_float_needed     numeric(14,2);
  v_lock_usd         numeric(14,2);
  v_txn_id           uuid := gen_random_uuid();
  v_platform         uuid := '00000000-0000-0000-0000-000000000000';
  v_is_first_deposit boolean;
BEGIN
  IF p_fx_rate IS NULL OR p_fx_rate <= 0 THEN
    RAISE EXCEPTION 'INVALID_FX_RATE: must be a positive number, got %', p_fx_rate
      USING ERRCODE = '22003';
  END IF;

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

  SELECT * INTO v_settings FROM public.system_settings WHERE id = 1;

  v_settled_usd := ROUND(v_deposit.amount_submitted * p_fx_rate, 2);
  IF v_settled_usd < v_settings.min_deposit_usd THEN
    RAISE EXCEPTION 'BELOW_MINIMUM_DEPOSIT: settled $% is below required minimum $%',
      v_settled_usd, v_settings.min_deposit_usd
      USING ERRCODE = '23514';
  END IF;

  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = v_deposit.user_id AND currency = 'USD'
  FOR UPDATE;

  -- Per-investor float: only top the spendable wallet up to wallet_float_usd;
  -- everything else in this deposit becomes locked trading capital.
  v_available_now := GREATEST(v_wallet.balance - v_wallet.locked_principal, 0);
  v_float_needed  := GREATEST(COALESCE(v_settings.wallet_float_usd, 100) - v_available_now, 0);
  v_lock_usd      := GREATEST(v_settled_usd - v_float_needed, 0);

  UPDATE public.deposits SET
    status             = 'approved',
    fx_rate_applied    = p_fx_rate,
    settled_amount_usd = v_settled_usd,
    reviewed_by        = p_reviewed_by,
    reviewed_at        = now()
  WHERE id = p_deposit_id;

  INSERT INTO public.ledger_entries
    (transaction_id, account_id, entry_type, amount, currency,
     reference_table, reference_id, note, created_by)
  VALUES
    (v_txn_id, v_deposit.user_id, 'deposit', v_settled_usd, 'USD',
     'deposits', p_deposit_id, 'Deposit approved', p_reviewed_by),
    (v_txn_id, v_platform, 'deposit', -v_settled_usd, 'USD',
     'deposits', p_deposit_id, 'Deposit approved', p_reviewed_by);

  UPDATE public.wallets
  SET balance          = balance + v_settled_usd,
      locked_principal = locked_principal + v_lock_usd,
      updated_at       = now()
  WHERE user_id = v_deposit.user_id AND currency = 'USD';

  IF v_lock_usd > 0 THEN
    INSERT INTO public.principal_lock_blocks
      (deposit_id, user_id, principal_usd, locked_until)
    VALUES
      (p_deposit_id, v_deposit.user_id, v_lock_usd,
       now() + (v_settings.lockup_period_days || ' days')::interval);
  END IF;

  -- (Pool auto-allocation block removed — no more investor_pool_allocations.)
  v_is_first_deposit := NOT EXISTS (
    SELECT 1 FROM public.deposits
    WHERE user_id = v_deposit.user_id AND status = 'approved' AND id != p_deposit_id
  );

  UPDATE public.deposit_users
  SET deposit_status = 'approved'
  WHERE id = v_deposit.user_id
    AND deposit_status != 'approved';

  RETURN jsonb_build_object(
    'success', true,
    'settled_amount_usd', v_settled_usd,
    'wallet_available_usd', v_settled_usd - v_lock_usd,
    'trading_capital_usd', v_lock_usd,
    'first_deposit', v_is_first_deposit
  );
END;
$$;

-- ── 2. close_trade_execution — flat per-investor distribution, no pool math ──
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
  v_investor record;
  v_wallet public.wallets%ROWTYPE;
  v_share numeric(14,2);
  v_txn_id uuid;
  v_platform_account_id uuid := '00000000-0000-0000-0000-000000000000';
  v_credited int := 0;
  v_distributed numeric(14,2) := 0;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'SERVICE_OR_SUPER_ADMIN_REQUIRED' USING ERRCODE = '42501';
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

  UPDATE public.trade_executions
    SET status = 'closed',
        current_price = p_close_price,
        realized_pl_usd = p_realized_pl_usd,
        closed_at = now()
    WHERE id = p_execution_id;

  IF p_realized_pl_usd != 0 THEN
    IF v_execution.target_investor_id IS NOT NULL THEN
      -- Targeted trade: the ONE assigned investor gets the full amount.
      FOR v_investor IN
        SELECT id AS user_id FROM public.deposit_users
        WHERE id = v_execution.target_investor_id
      LOOP
        SELECT * INTO v_wallet
          FROM public.wallets
          WHERE user_id = v_investor.user_id AND currency = 'USD'
          FOR UPDATE;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_share := p_realized_pl_usd;
        IF v_wallet.balance + v_share < 0 THEN
          v_share := -v_wallet.balance;
        END IF;
        IF v_share = 0 THEN CONTINUE; END IF;

        v_txn_id := gen_random_uuid();
        INSERT INTO public.ledger_entries
          (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
        VALUES
          (v_txn_id, v_investor.user_id, 'trade_pl', v_share, 'USD', 'trade_executions', p_execution_id,
           'Trade P/L: ' || v_execution.asset_pair, auth.uid()),
          (v_txn_id, v_platform_account_id, 'trade_pl', -v_share, 'USD', 'trade_executions', p_execution_id,
           'Trade P/L: ' || v_execution.asset_pair, auth.uid());

        UPDATE public.wallets
          SET balance = balance + v_share, updated_at = now()
          WHERE user_id = v_investor.user_id AND currency = 'USD';

        v_credited := v_credited + 1;
        v_distributed := v_distributed + v_share;
      END LOOP;
    ELSE
      -- Broadcast trade: EVERY approved investor gets the SAME dollar
      -- result — not divided, since each investor's account independently
      -- experiences the identical trade outcome.
      FOR v_investor IN
        SELECT id AS user_id FROM public.deposit_users
        WHERE role = 'investor' AND deposit_status = 'approved'
        ORDER BY id -- deterministic lock order prevents deadlocks between concurrent closes
      LOOP
        SELECT * INTO v_wallet
          FROM public.wallets
          WHERE user_id = v_investor.user_id AND currency = 'USD'
          FOR UPDATE;
        IF NOT FOUND THEN CONTINUE; END IF;

        v_share := p_realized_pl_usd;
        -- A loss can't take a wallet below zero — cap the deduction.
        IF v_wallet.balance + v_share < 0 THEN
          v_share := -v_wallet.balance;
        END IF;
        IF v_share = 0 THEN CONTINUE; END IF;

        v_txn_id := gen_random_uuid();
        INSERT INTO public.ledger_entries
          (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
        VALUES
          (v_txn_id, v_investor.user_id, 'trade_pl', v_share, 'USD', 'trade_executions', p_execution_id,
           'Trade P/L: ' || v_execution.asset_pair, auth.uid()),
          (v_txn_id, v_platform_account_id, 'trade_pl', -v_share, 'USD', 'trade_executions', p_execution_id,
           'Trade P/L: ' || v_execution.asset_pair, auth.uid());

        UPDATE public.wallets
          SET balance = balance + v_share, updated_at = now()
          WHERE user_id = v_investor.user_id AND currency = 'USD';

        v_credited := v_credited + 1;
        v_distributed := v_distributed + v_share;
      END LOOP;
    END IF;
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
  'Closes an execution and credits its realized P/L to investors: the one target_investor_id if the trade was targeted, or the SAME dollar amount to every approved investor if it was a broadcast (no pool/allocation weighting). Entire fan-out is one transaction. Service role or super_admin only.';

-- ── 3. Drop the allocation table and the pool "target %" column ──────────────
DROP TABLE IF EXISTS public.investor_pool_allocations;

ALTER TABLE public.strategy_pools
  DROP COLUMN IF EXISTS target_allocation_pct;
