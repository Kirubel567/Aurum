-- ============================================================================
-- Lot size — real position sizing for trade_executions, replacing the
-- free-text "leverage" the admin used to type. Leverage becomes a derived,
-- per-instrument-class display label (see src/lib/trading/lot-size.ts); lot
-- size is what the admin actually enters, matching real trading terminology.
-- ============================================================================

ALTER TABLE public.trade_executions
  ADD COLUMN IF NOT EXISTS lot_size numeric(12,4);

COMMENT ON COLUMN public.trade_executions.lot_size IS
  'Position size in lots (contract-size convention varies by instrument class — see src/lib/trading/lot-size.ts). Notional value and unrealized P/L are computed from this, never stored redundantly. NULL for trades opened before this column existed.';

COMMENT ON COLUMN public.trade_executions.leverage IS
  'Display label only, e.g. "1:100" — auto-derived per instrument class from lot_size context (src/lib/trading/lot-size.ts), not admin-entered free text as of this migration. Historical rows may still carry the old free-text value.';
