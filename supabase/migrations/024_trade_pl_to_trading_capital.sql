-- Migration 024: Trade P/L compounds into trading capital, not spendable wallet
--
-- Business rule clarified by the user: the spendable wallet only ever holds
-- the per-investor float (default $100, for withdrawals/personal use). A
-- trade's profit or loss must never touch that float — it stays in trading
-- capital (locked_principal) so it keeps getting traded. Only a future
-- "challenge settlement" feature (not built yet) will move a withdrawable
-- share of accumulated profit out to the spendable wallet.
--
-- Previous bug (introduced in migration 023, inherited from 010/008/007):
-- close_trade_execution() only did `balance += v_share`, never touching
-- locked_principal. Since spendable = balance - locked_principal, every
-- trade's P/L was landing directly in the withdrawable bucket immediately.
--
-- Fix: credit BOTH balance and locked_principal by the same amount, so
-- spendable (the float) is unchanged by trading. Loss cap is now based on
-- locked_principal reaching zero (trading capital can't go negative) rather
-- than total balance reaching zero — a big loss can wipe out trading
-- capital, but must never eat into the untouchable float.

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
        -- Trading capital floors at zero — the spendable float is never touched.
        IF v_wallet.locked_principal + v_share < 0 THEN
          v_share := -v_wallet.locked_principal;
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
          SET balance = balance + v_share,
              locked_principal = locked_principal + v_share,
              updated_at = now()
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
        -- Trading capital floors at zero — the spendable float is never touched.
        IF v_wallet.locked_principal + v_share < 0 THEN
          v_share := -v_wallet.locked_principal;
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
          SET balance = balance + v_share,
              locked_principal = locked_principal + v_share,
              updated_at = now()
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
  'Closes an execution and credits its realized P/L into TRADING CAPITAL (balance and locked_principal both move together) for the one target_investor_id if targeted, or the SAME dollar amount to every approved investor if broadcast. The spendable float is never touched by trade P/L. Entire fan-out is one transaction. Service role or super_admin only.';
