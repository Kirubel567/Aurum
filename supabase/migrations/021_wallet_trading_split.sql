-- Migration 021: Wallet / trading-capital split + lock enforcement fix
--
-- Business rule: of every approved deposit, only $100 stays freely available
-- in the investor's wallet. The remainder is trading capital — locked while
-- the traders use it, withdrawable only after the lock-up period ends.
--
-- Also fixes a real bug: approve_deposit inserted principal_lock_blocks rows
-- but never updated wallets.locked_principal — and request_withdrawal checks
-- wallets.locked_principal — so the lock-up was never actually enforced.

-- ── 1. Wallet spendable float kept outside trading capital ────────────────────

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS wallet_float_usd numeric(14,2) NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.system_settings.wallet_float_usd IS
  'Portion of each approved deposit that stays freely available in the wallet. The remainder is locked as trading capital until the deposit''s lock-up matures.';

-- ── 2. release_matured_locks — lazy lock release ──────────────────────────────
-- Marks matured lock blocks released and decrements the wallet cache.
-- Called at the top of request_withdrawal and by the wallet summary API.

CREATE OR REPLACE FUNCTION public.release_matured_locks(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_released numeric;
BEGIN
  -- Lock the wallet row so concurrent releases can't double-decrement.
  PERFORM id FROM public.wallets
  WHERE user_id = p_user_id AND currency = 'USD'
  FOR UPDATE;

  WITH matured AS (
    UPDATE public.principal_lock_blocks
    SET released = true
    WHERE user_id = p_user_id
      AND released = false
      AND locked_until <= now()
    RETURNING principal_usd
  )
  SELECT COALESCE(SUM(principal_usd), 0) INTO v_released FROM matured;

  IF v_released > 0 THEN
    UPDATE public.wallets
    SET locked_principal = GREATEST(locked_principal - v_released, 0),
        updated_at       = now()
    WHERE user_id = p_user_id AND currency = 'USD';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.release_matured_locks(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.release_matured_locks(uuid) FROM anon, authenticated;

-- ── 3. approve_deposit v2 — wallet float + locked trading capital ─────────────

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

  -- Everything beyond the wallet float is locked trading capital.
  v_lock_usd := GREATEST(v_settled_usd - COALESCE(v_settings.wallet_float_usd, 100), 0);

  PERFORM id FROM public.wallets
  WHERE user_id = v_deposit.user_id AND currency = 'USD'
  FOR UPDATE;

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

  -- Credit the full amount, and cache the locked trading-capital portion —
  -- request_withdrawal enforces balance − locked_principal − pending.
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

-- ── 4. Backfill: enforce locks for already-approved deposits ──────────────────
-- Old approve_deposit locked the FULL settled amount. Apply the new rule to
-- existing unexpired blocks (leave $100 free per deposit), then rebuild the
-- wallets.locked_principal cache that the old RPC never maintained.

UPDATE public.principal_lock_blocks
SET principal_usd = GREATEST(principal_usd - 100, 0)
WHERE released = false AND locked_until > now();

UPDATE public.wallets w
SET locked_principal = COALESCE(sub.total, 0)
FROM (
  SELECT user_id, SUM(principal_usd) AS total
  FROM public.principal_lock_blocks
  WHERE released = false AND locked_until > now()
  GROUP BY user_id
) sub
WHERE w.user_id = sub.user_id AND w.currency = 'USD';
