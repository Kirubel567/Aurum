-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 014 — Phase 5+13: Withdrawal pipeline
-- saved_bank_accounts table, withdrawal-related system_settings columns,
-- note column on withdrawals, and the three withdrawal RPCs.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. saved_bank_accounts ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.saved_bank_accounts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES deposit_users(id) ON DELETE CASCADE,
  bank_name        text NOT NULL,
  account_holder   text NOT NULL,
  account_number   text NOT NULL,
  swift_code       text,
  is_primary       boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Enforce at most one primary per investor at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS one_primary_per_user
  ON public.saved_bank_accounts (user_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS sba_user_idx ON public.saved_bank_accounts (user_id);

-- RLS: investors manage their own rows; staff read-only (needed for withdrawal review)
ALTER TABLE public.saved_bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sba_investor_all   ON public.saved_bank_accounts;
DROP POLICY IF EXISTS sba_staff_read     ON public.saved_bank_accounts;

CREATE POLICY sba_investor_all ON public.saved_bank_accounts
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY sba_staff_read ON public.saved_bank_accounts
  FOR SELECT TO authenticated
  USING (is_staff());

-- ── 2. withdrawals.note column ────────────────────────────────────────────────

ALTER TABLE public.withdrawals ADD COLUMN IF NOT EXISTS note text;

-- ── 3. system_settings — withdrawal config columns ────────────────────────────

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS min_withdrawal_usd    numeric(14,2) NOT NULL DEFAULT 500,
  ADD COLUMN IF NOT EXISTS standard_fee_rate     numeric(6,5)  NOT NULL DEFAULT 0.005,
  ADD COLUMN IF NOT EXISTS express_fee_rate      numeric(6,5)  NOT NULL DEFAULT 0.01,
  ADD COLUMN IF NOT EXISTS withdrawal_daily_limit   numeric(14,2) NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS withdrawal_monthly_limit numeric(14,2) NOT NULL DEFAULT 50000;

-- ── 4. request_withdrawal RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.request_withdrawal(
  p_user_id         uuid,
  p_amount_usd      numeric,
  p_bank_account_id uuid,
  p_method          text,
  p_note            text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet        wallets%ROWTYPE;
  v_settings      system_settings%ROWTYPE;
  v_pending_sum   numeric;
  v_available     numeric;
  v_daily_used    numeric;
  v_month_used    numeric;
  v_fee_rate      numeric;
  v_fee_usd       numeric;
  v_net_usd       numeric;
  v_reference     text;
  v_withdrawal_id uuid;
BEGIN
  -- Lock this investor's wallet row for the duration of the transaction
  SELECT * INTO v_wallet
  FROM wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WALLET_NOT_FOUND';
  END IF;

  -- Fetch platform settings (min withdrawal, fee rates, limits)
  SELECT * INTO v_settings FROM system_settings LIMIT 1;

  -- Amount validation
  IF p_amount_usd <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT';
  END IF;

  IF p_amount_usd < v_settings.min_withdrawal_usd THEN
    RAISE EXCEPTION 'BELOW_MINIMUM_WITHDRAWAL: minimum is $%', v_settings.min_withdrawal_usd;
  END IF;

  -- Sum pending withdrawals (held, not yet approved/rejected)
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_pending_sum
  FROM withdrawals
  WHERE user_id = p_user_id AND status = 'pending';

  -- Available balance = total balance - locked principal - held pending withdrawals
  v_available := v_wallet.balance - v_wallet.locked_principal - v_pending_sum;

  IF p_amount_usd > v_available THEN
    RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE: available is $%', v_available;
  END IF;

  -- Daily limit: count pending + approved withdrawals submitted today
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_daily_used
  FROM withdrawals
  WHERE user_id = p_user_id
    AND status IN ('pending', 'approved')
    AND created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC');

  IF v_daily_used + p_amount_usd > v_settings.withdrawal_daily_limit THEN
    RAISE EXCEPTION 'DAILY_LIMIT_EXCEEDED: daily limit is $%', v_settings.withdrawal_daily_limit;
  END IF;

  -- Monthly limit
  SELECT COALESCE(SUM(amount_usd), 0) INTO v_month_used
  FROM withdrawals
  WHERE user_id = p_user_id
    AND status IN ('pending', 'approved')
    AND created_at >= date_trunc('month', NOW() AT TIME ZONE 'UTC');

  IF v_month_used + p_amount_usd > v_settings.withdrawal_monthly_limit THEN
    RAISE EXCEPTION 'MONTHLY_LIMIT_EXCEEDED: monthly limit is $%', v_settings.withdrawal_monthly_limit;
  END IF;

  -- Fee calculation
  v_fee_rate := CASE
    WHEN p_method = 'express' THEN v_settings.express_fee_rate
    ELSE v_settings.standard_fee_rate
  END;
  v_fee_usd := ROUND(p_amount_usd * v_fee_rate, 2);
  v_net_usd := p_amount_usd - v_fee_usd;

  -- Human-readable reference
  v_reference := 'WD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-'
    || UPPER(SUBSTRING(MD5(gen_random_uuid()::text) FROM 1 FOR 6));

  -- Insert withdrawal row
  INSERT INTO withdrawals (
    user_id, amount_usd, fee_usd, net_usd, method,
    bank_account_id, status, reference, note
  )
  VALUES (
    p_user_id, p_amount_usd, v_fee_usd, v_net_usd, p_method,
    p_bank_account_id, 'pending', v_reference, p_note
  )
  RETURNING id INTO v_withdrawal_id;

  RETURN v_withdrawal_id;
END;
$$;

-- ── 5. approve_withdrawal RPC ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_withdrawal_id uuid,
  p_reviewed_by   uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal withdrawals%ROWTYPE;
  v_wallet     wallets%ROWTYPE;
  v_sentinel   uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- Lock and fetch withdrawal
  SELECT * INTO v_withdrawal
  FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND';
  END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_PENDING: current status is %', v_withdrawal.status;
  END IF;

  -- Lock investor wallet
  SELECT * INTO v_wallet
  FROM wallets WHERE user_id = v_withdrawal.user_id FOR UPDATE;

  -- Re-validate balance (guards against race conditions)
  IF v_wallet.balance < v_withdrawal.amount_usd THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE_AT_APPROVAL';
  END IF;

  -- Stamp approved
  UPDATE withdrawals
  SET status      = 'approved',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW()
  WHERE id = p_withdrawal_id;

  -- Double-entry ledger (debit investor, credit sentinel for platform outflow tracking)
  INSERT INTO ledger_entries (account_id, entry_type, amount, reference_id, note)
  VALUES
    (v_withdrawal.user_id, 'withdrawal', -v_withdrawal.amount_usd, p_withdrawal_id,
     'Withdrawal approved: ' || v_withdrawal.reference),
    (v_sentinel,           'withdrawal',  v_withdrawal.amount_usd,  p_withdrawal_id,
     'Withdrawal outflow: '  || v_withdrawal.reference);

  -- Deduct from wallet balance
  UPDATE wallets
  SET balance = balance - v_withdrawal.amount_usd
  WHERE user_id = v_withdrawal.user_id;
END;
$$;

-- ── 6. reject_withdrawal RPC ──────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_withdrawal_id uuid,
  p_reviewed_by   uuid,
  p_reason        text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal withdrawals%ROWTYPE;
BEGIN
  SELECT * INTO v_withdrawal
  FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND';
  END IF;

  IF v_withdrawal.status <> 'pending' THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_PENDING: current status is %', v_withdrawal.status;
  END IF;

  -- Stamp rejected — no wallet or ledger changes (pending withdrawal was a hold, not a debit)
  UPDATE withdrawals
  SET status           = 'rejected',
      reviewed_by      = p_reviewed_by,
      reviewed_at      = NOW(),
      rejection_reason = p_reason
  WHERE id = p_withdrawal_id;
END;
$$;

-- ── 7. Grant execute on all three RPCs ───────────────────────────────────────

GRANT EXECUTE ON FUNCTION public.request_withdrawal  TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal   TO authenticated;
