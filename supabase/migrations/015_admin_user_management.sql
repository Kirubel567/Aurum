-- ============================================================================
-- Phase 14 — Admin User Management
-- Adds: balance_overrides table, admin_adjust_balance/yield RPCs,
--       is_suspended column on deposit_users, new ledger entry types.
-- Also fixes: approve_withdrawal ledger INSERT was missing transaction_id.
-- ============================================================================

-- ── 1. New ledger entry types ─────────────────────────────────────────────────
ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'manual_adjustment';
ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'yield_credit';

-- ── 2. Account suspension flag on deposit_users ───────────────────────────────
ALTER TABLE public.deposit_users
  ADD COLUMN IF NOT EXISTS is_suspended boolean NOT NULL DEFAULT false;

-- ── 3. balance_overrides audit table ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.balance_overrides (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.deposit_users(id),
  amount_usd   numeric(14,2) NOT NULL,
  reason       text        NOT NULL,
  performed_by uuid        NOT NULL REFERENCES public.deposit_users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS balance_overrides_user_idx
  ON public.balance_overrides (user_id, created_at DESC);

ALTER TABLE public.balance_overrides ENABLE ROW LEVEL SECURITY;

-- Staff read only; no client-reachable mutations (all writes go through RPCs)
DROP POLICY IF EXISTS "balance_overrides_select_staff" ON public.balance_overrides;
CREATE POLICY "balance_overrides_select_staff"
  ON public.balance_overrides FOR SELECT
  USING (public.is_staff());

DROP POLICY IF EXISTS "balance_overrides_select_own" ON public.balance_overrides;
CREATE POLICY "balance_overrides_select_own"
  ON public.balance_overrides FOR SELECT
  USING (user_id = auth.uid());

-- ── 4. Fix approve_withdrawal — missing transaction_id in ledger INSERT ────────
-- Migration 014 shipped with a bug: the ledger_entries INSERT omitted
-- transaction_id (NOT NULL). Replace the function with the corrected version.
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
  v_txn_id     uuid := gen_random_uuid();
BEGIN
  SELECT * INTO v_withdrawal
  FROM withdrawals WHERE id = p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND';
  END IF;
  IF v_withdrawal.status <> 'pending' THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_PENDING: current status is %', v_withdrawal.status;
  END IF;

  SELECT * INTO v_wallet
  FROM wallets WHERE user_id = v_withdrawal.user_id FOR UPDATE;
  IF v_wallet.balance < v_withdrawal.amount_usd THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE_AT_APPROVAL';
  END IF;

  UPDATE withdrawals
  SET status      = 'approved',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW()
  WHERE id = p_withdrawal_id;

  INSERT INTO ledger_entries
    (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
  VALUES
    (v_txn_id, v_withdrawal.user_id, 'withdrawal', -v_withdrawal.amount_usd, 'USD',
     'withdrawals', p_withdrawal_id, 'Withdrawal approved: ' || v_withdrawal.reference, p_reviewed_by),
    (v_txn_id, v_sentinel,           'withdrawal',  v_withdrawal.amount_usd,  'USD',
     'withdrawals', p_withdrawal_id, 'Withdrawal outflow: '  || v_withdrawal.reference, p_reviewed_by);

  UPDATE wallets
  SET balance = balance - v_withdrawal.amount_usd
  WHERE user_id = v_withdrawal.user_id;
END;
$$;

-- ── 5. admin_adjust_balance RPC ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id uuid,
  p_amount  numeric,
  p_reason  text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_wallet      wallets%ROWTYPE;
  v_sentinel    uuid := '00000000-0000-0000-0000-000000000000';
  v_txn_id      uuid := gen_random_uuid();
  v_override_id uuid;
BEGIN
  SELECT role INTO v_caller_role FROM deposit_users WHERE id = v_caller_id;
  IF v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: super_admin only.';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required for balance adjustments.';
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No wallet found for user.';
  END IF;

  IF v_wallet.balance + p_amount < 0 THEN
    RAISE EXCEPTION 'Adjustment would result in a negative balance.';
  END IF;

  UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_user_id;

  -- Audit record first (get its id for reference_id in ledger)
  INSERT INTO balance_overrides (user_id, amount_usd, reason, performed_by)
  VALUES (p_user_id, p_amount, p_reason, v_caller_id)
  RETURNING id INTO v_override_id;

  -- Double-entry ledger
  INSERT INTO ledger_entries
    (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
  VALUES
    (v_txn_id, p_user_id,  'manual_adjustment',  p_amount, 'USD',
     'balance_overrides', v_override_id, 'Balance adjustment: ' || p_reason, v_caller_id),
    (v_txn_id, v_sentinel, 'manual_adjustment', -p_amount, 'USD',
     'balance_overrides', v_override_id, 'Balance adjustment offset: ' || p_reason, v_caller_id);
END;
$$;

-- ── 6. admin_adjust_yield RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_adjust_yield(
  p_user_id uuid,
  p_amount  numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id   uuid := auth.uid();
  v_caller_role text;
  v_wallet      wallets%ROWTYPE;
  v_sentinel    uuid := '00000000-0000-0000-0000-000000000000';
  v_txn_id      uuid := gen_random_uuid();
BEGIN
  SELECT role INTO v_caller_role FROM deposit_users WHERE id = v_caller_id;
  IF v_caller_role <> 'super_admin' THEN
    RAISE EXCEPTION 'Forbidden: super_admin only.';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Yield credit must be a positive amount.';
  END IF;

  SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No wallet found for user.';
  END IF;

  UPDATE wallets SET balance = balance + p_amount WHERE user_id = p_user_id;

  INSERT INTO ledger_entries
    (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
  VALUES
    (v_txn_id, p_user_id,  'yield_credit',  p_amount, 'USD',
     'wallets', v_wallet.id, 'Manual yield credit', v_caller_id),
    (v_txn_id, v_sentinel, 'yield_credit', -p_amount, 'USD',
     'wallets', v_wallet.id, 'Manual yield credit offset', v_caller_id);
END;
$$;

-- ── 7. Grant execute ──────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.admin_adjust_balance TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_yield   TO authenticated;
