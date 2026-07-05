-- ============================================================================
-- Equity snapshots — the persistent history behind the investor's live
-- equity chart (prop-firm style). Every poll of /api/orders/live records a
-- throttled snapshot of balance + floating P/L, so the chart traces what
-- actually happened over time instead of being rebuilt from a rolling
-- window that "resets". Append-only; investors read their own rows.
-- ============================================================================

create table if not exists public.equity_snapshots (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.deposit_users(id) on delete cascade,
  balance     numeric(14,2) not null,
  equity      numeric(14,2) not null,
  floating_pl numeric(14,2) not null default 0,
  created_at  timestamptz not null default now()
);

-- The chart always reads "this user's snapshots, newest window first".
create index if not exists equity_snapshots_user_time_idx
  on public.equity_snapshots (user_id, created_at desc);

alter table public.equity_snapshots enable row level security;

-- Investors see only their own history. All writes go through the
-- service-role client in the API route — no client-side insert policy.
create policy "equity_snapshots_select_own"
  on public.equity_snapshots for select
  using (auth.uid() = user_id);
