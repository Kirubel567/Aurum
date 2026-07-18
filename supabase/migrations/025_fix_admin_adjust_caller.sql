-- Migration 025: admin_adjust_balance / admin_adjust_yield take an explicit
-- caller id instead of auth.uid()
--
-- Bug: both RPCs derived the acting super_admin from auth.uid(). But the admin
-- routes call them through the SERVICE-ROLE client (createServerClient), where
-- auth.uid() is NULL. Consequences:
--   * admin_adjust_balance wrote performed_by = NULL into balance_overrides,
--     whose performed_by column is NOT NULL → the INSERT failed → the whole
--     function rolled back (including the wallet update) → the balance
--     override silently did nothing. This is why balance overrides never
--     applied.
--   * The `role <> 'super_admin'` guard compared NULL, which is never true,
--     so the function's own authorization check was effectively bypassed
--     (the routes still enforce super_admin, but the RPC guard was dead).
--   * created_by on the ledger rows was NULL (no attribution).
--
-- Fix: pass the caller's user id explicitly (p_performed_by), exactly like
-- approve_deposit(p_reviewed_by) / approve_withdrawal(p_reviewed_by) already
-- do. Use it for the authorization check and for performed_by / created_by.

-- ── admin_adjust_balance ─────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_adjust_balance(uuid, numeric, text);
CREATE OR REPLACE FUNCTION public.admin_adjust_balance(
  p_user_id      uuid,
  p_amount       numeric,
  p_reason       text,
  p_performed_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_wallet      wallets%ROWTYPE;
  v_sentinel    uuid := '00000000-0000-0000-0000-000000000000';
  v_txn_id      uuid := gen_random_uuid();
  v_override_id uuid;
BEGIN
  SELECT role INTO v_caller_role FROM deposit_users WHERE id = p_performed_by;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
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

  INSERT INTO balance_overrides (user_id, amount_usd, reason, performed_by)
  VALUES (p_user_id, p_amount, p_reason, p_performed_by)
  RETURNING id INTO v_override_id;

  INSERT INTO ledger_entries
    (transaction_id, account_id, entry_type, amount, currency, reference_table, reference_id, note, created_by)
  VALUES
    (v_txn_id, p_user_id,  'manual_adjustment',  p_amount, 'USD',
     'balance_overrides', v_override_id, 'Balance adjustment: ' || p_reason, p_performed_by),
    (v_txn_id, v_sentinel, 'manual_adjustment', -p_amount, 'USD',
     'balance_overrides', v_override_id, 'Balance adjustment offset: ' || p_reason, p_performed_by);
END;
$$;

-- ── admin_adjust_yield ───────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.admin_adjust_yield(uuid, numeric);
CREATE OR REPLACE FUNCTION public.admin_adjust_yield(
  p_user_id      uuid,
  p_amount       numeric,
  p_performed_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_role text;
  v_wallet      wallets%ROWTYPE;
  v_sentinel    uuid := '00000000-0000-0000-0000-000000000000';
  v_txn_id      uuid := gen_random_uuid();
BEGIN
  SELECT role INTO v_caller_role FROM deposit_users WHERE id = p_performed_by;
  IF v_caller_role IS DISTINCT FROM 'super_admin' THEN
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
     'wallets', v_wallet.id, 'Manual yield credit', p_performed_by),
    (v_txn_id, v_sentinel, 'yield_credit', -p_amount, 'USD',
     'wallets', v_wallet.id, 'Manual yield credit offset', p_performed_by);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_adjust_balance(uuid, numeric, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_yield(uuid, numeric, uuid) TO authenticated;
