-- ============================================================================
-- Trading schema — strategy pools, per-investor allocations, trade executions.
-- Blueprint: PHASE 2 (schema + RLS) + groundwork for PHASE 11 (trade_pl enum
-- value, consumed by close_trade_execution() in migration 008).
--
-- Trade rows are pool-level shared platform data (every investor allocated
-- to a pool sees that pool's executions) — inserted ONLY by super_admin via
-- the Phase 11 console, never by investors or automated feeds.
-- ============================================================================

-- 'trade_pl' is added here (not in 008) so the enum value is committed
-- before any function body references it.
ALTER TYPE ledger_entry_type ADD VALUE IF NOT EXISTS 'trade_pl';

-- ── 1. strategy_pools ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.strategy_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tag_color text NOT NULL,                 -- UI token: 'gold' | 'slate' | 'dark'
  tag text,                                -- UI badge label, e.g. "High Stability"
  target_allocation_pct numeric(5,2) NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,       -- stable display order ("Liquidity Pool N")
  active boolean NOT NULL DEFAULT true
);

-- ── 2. investor_pool_allocations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.investor_pool_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  strategy_pool_id uuid NOT NULL REFERENCES public.strategy_pools(id),
  allocation_pct numeric(5,2) NOT NULL,
  set_by uuid REFERENCES public.deposit_users(id), -- NULL = system default, else admin override
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, strategy_pool_id)
);
CREATE INDEX IF NOT EXISTS investor_pool_allocations_user_idx
  ON public.investor_pool_allocations (user_id);

-- ── 3. trade_executions ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trade_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_pool_id uuid NOT NULL REFERENCES public.strategy_pools(id),
  asset_pair text NOT NULL,
  side text NOT NULL CHECK (side IN ('LONG','SHORT')),
  leverage text,
  entry_price numeric(14,4) NOT NULL,
  current_price numeric(14,4),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  realized_pl_usd numeric(14,2),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX IF NOT EXISTS trade_executions_pool_idx
  ON public.trade_executions (strategy_pool_id, status, opened_at DESC);
CREATE INDEX IF NOT EXISTS trade_executions_status_idx
  ON public.trade_executions (status, opened_at DESC);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────
ALTER TABLE public.strategy_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investor_pool_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_executions ENABLE ROW LEVEL SECURITY;

-- Pools + executions: shared platform data, readable by any authenticated
-- user. No client-side write policies — mutations go through Phase 11's
-- super_admin routes (service role) and, for money movement, the RPC in 008.
DROP POLICY IF EXISTS "strategy_pools_select_authenticated" ON public.strategy_pools;
CREATE POLICY "strategy_pools_select_authenticated"
  ON public.strategy_pools FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "trade_executions_select_authenticated" ON public.trade_executions;
CREATE POLICY "trade_executions_select_authenticated"
  ON public.trade_executions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allocations: owner reads own rows, staff read all. Mutations are
-- super_admin-only and happen server-side (service role) — no client policy.
DROP POLICY IF EXISTS "investor_pool_allocations_select_own" ON public.investor_pool_allocations;
CREATE POLICY "investor_pool_allocations_select_own"
  ON public.investor_pool_allocations FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "investor_pool_allocations_select_staff" ON public.investor_pool_allocations;
CREATE POLICY "investor_pool_allocations_select_staff"
  ON public.investor_pool_allocations FOR SELECT
  USING (public.is_staff());

-- ── 5. Seed the three pools the UI already shows ─────────────────────────────
-- Names/tags/colors match the existing LivePerformancePage + dashboard donut,
-- not the blueprint's placeholder names.
INSERT INTO public.strategy_pools (name, tag_color, tag, target_allocation_pct, description, sort_order)
SELECT * FROM (VALUES
  ('Forex Majors',   'gold',  'High Stability',      40.00::numeric(5,2), 'Major currency pairs strategy pool', 1),
  ('Commodities',    'slate', 'Precious Metals',     30.00::numeric(5,2), 'Commodities and precious metals pool', 2),
  ('Global Indices', 'dark',  'Diversified Growth',  30.00::numeric(5,2), 'Global index exposure pool', 3)
) AS seed(name, tag_color, tag, target_allocation_pct, description, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.strategy_pools);

-- ── 6. Default allocations for existing approved investors ──────────────────
-- Every already-approved investor gets the pools' target percentages as
-- their personal allocation (set_by NULL = system default). New investors
-- get theirs at first deposit approval — Phase 13 hook, flagged in HANDOFF.
INSERT INTO public.investor_pool_allocations (user_id, strategy_pool_id, allocation_pct, set_by)
SELECT du.id, sp.id, sp.target_allocation_pct, NULL
FROM public.deposit_users du
CROSS JOIN public.strategy_pools sp
WHERE du.role = 'investor'
  AND du.deposit_status = 'approved'
ON CONFLICT (user_id, strategy_pool_id) DO NOTHING;

COMMENT ON TABLE public.strategy_pools IS
  'Platform strategy pools. Seeded with the three pools the UI shipped with; super_admin manages via Phase 12/16 later.';
COMMENT ON TABLE public.trade_executions IS
  'Manually recorded trades (Phase 11 console, super_admin only). Pool-level shared data — investor-facing pages join through investor_pool_allocations.';
