-- ============================================================================
-- Trade risk/reward — real take-profit/stop-loss columns for trade_executions,
-- replacing the "stuffed into a free-text note" stopgap from migration 008.
-- Lets the risk:reward ratio be computed directly instead of admin-entered.
-- ============================================================================

ALTER TABLE public.trade_executions
  ADD COLUMN IF NOT EXISTS take_profit_price numeric(14,4),
  ADD COLUMN IF NOT EXISTS stop_loss_price numeric(14,4);

COMMENT ON COLUMN public.trade_executions.take_profit_price IS
  'Optional target price set at open. Risk/reward = |take_profit_price - entry_price| / |entry_price - stop_loss_price|, computed on read, never stored redundantly.';
COMMENT ON COLUMN public.trade_executions.stop_loss_price IS
  'Optional stop price set at open. See take_profit_price comment for the risk/reward formula.';
