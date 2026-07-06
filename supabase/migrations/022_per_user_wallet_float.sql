-- Migration 022: Wallet float is per INVESTOR, not per deposit
--
-- Business rule refined: an investor's wallet holds at most $100
-- (system_settings.wallet_float_usd) of spendable money in total. Every
-- approved deposit locks everything except whatever is needed to top the
-- wallet float up to $100. All the rest is trading capital.
--
-- Also: equity_snapshots now record per-investor TRADING P/L (realized +
-- floating), not account equity — old rows recorded deposit-inclusive
-- balances and would corrupt the new trading-only charts, so they're purged.

-- ── 1. approve_deposit v3 — top-up-to-float rule ──────────────────────────────

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

  v_is_first_deposit := NOT EXISTS (
    SELECT 1 FROM public.investor_pool_allocations
    WHERE user_id = v_deposit.user_id
  );

  UPDATE public.deposit_users
  SET deposit_status = 'approved'
  WHERE id = v_deposit.user_id
    AND deposit_status != 'approved';

  IF v_is_first_deposit THEN
    INSERT INTO public.investor_pool_allocations (user_id, strategy_pool_id, allocation_pct)
    SELECT
      v_deposit.user_id,
      id,
      CASE name
        WHEN 'Forex Majors'   THEN 40
        WHEN 'Commodities'    THEN 30
        WHEN 'Global Indices' THEN 30
        ELSE 0
      END
    FROM public.strategy_pools
    WHERE active = true;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'settled_amount_usd', v_settled_usd,
    'wallet_available_usd', v_settled_usd - v_lock_usd,
    'trading_capital_usd', v_lock_usd,
    'first_deposit', v_is_first_deposit
  );
END;
$$;

-- ── 2. Backfill: cap every investor's spendable float at wallet_float_usd ─────
-- Investors whose available (balance − locked) exceeds the float and who are
-- inside an active lock-up get the excess moved into their newest lock block.

DO $$
DECLARE
  v_float numeric;
  r RECORD;
  v_excess numeric;
  v_block_id uuid;
BEGIN
  SELECT COALESCE(wallet_float_usd, 100) INTO v_float FROM public.system_settings WHERE id = 1;

  FOR r IN
    SELECT w.id AS wallet_id, w.user_id, (w.balance - w.locked_principal) AS available
    FROM public.wallets w
    WHERE w.currency = 'USD'
      AND (w.balance - w.locked_principal) > v_float
      AND EXISTS (
        SELECT 1 FROM public.principal_lock_blocks b
        WHERE b.user_id = w.user_id AND b.released = false AND b.locked_until > now()
      )
  LOOP
    v_excess := r.available - v_float;

    SELECT id INTO v_block_id
    FROM public.principal_lock_blocks
    WHERE user_id = r.user_id AND released = false AND locked_until > now()
    ORDER BY created_at DESC
    LIMIT 1;

    UPDATE public.principal_lock_blocks
    SET principal_usd = principal_usd + v_excess
    WHERE id = v_block_id;

    UPDATE public.wallets
    SET locked_principal = locked_principal + v_excess,
        updated_at       = now()
    WHERE id = r.wallet_id;
  END LOOP;
END $$;

-- ── 3. Purge legacy equity snapshots ──────────────────────────────────────────
-- Old rows recorded deposit-inclusive account equity; the new writer records
-- trading P/L only. Mixing the two would draw nonsense charts.

DELETE FROM public.equity_snapshots;
