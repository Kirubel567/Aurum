-- ============================================================================
-- Phase 9 — Profile Settings & Security
-- Adds profile columns to deposit_users; creates kyc_documents and
-- active_sessions tables with RLS policies.
-- ============================================================================

-- ── 1. deposit_users — new profile columns ────────────────────────────────────
ALTER TABLE public.deposit_users
  ADD COLUMN IF NOT EXISTS avatar_path    text,
  ADD COLUMN IF NOT EXISTS address        text,
  ADD COLUMN IF NOT EXISTS two_fa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS two_fa_secret  text,
  ADD COLUMN IF NOT EXISTS last_seen_at   timestamptz;

-- ── 2. kyc_documents ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.kyc_documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id  uuid        NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  doc_type     text        NOT NULL CHECK (doc_type IN ('passport', 'national_id', 'drivers_license', 'proof_of_address')),
  storage_path text        NOT NULL,
  status       text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  reviewed_at  timestamptz
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_investor_own" ON public.kyc_documents;
CREATE POLICY "kyc_investor_own"
  ON public.kyc_documents
  FOR ALL
  USING (investor_id = auth.uid())
  WITH CHECK (investor_id = auth.uid());

DROP POLICY IF EXISTS "kyc_staff_all" ON public.kyc_documents;
CREATE POLICY "kyc_staff_all"
  ON public.kyc_documents
  FOR ALL
  USING (public.is_staff());

-- ── 3. active_sessions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  device_label text        NOT NULL DEFAULT 'Unknown Browser',
  ip_address   text,
  is_current   boolean     NOT NULL DEFAULT false,
  revoked      boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_active  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS active_sessions_user_idx
  ON public.active_sessions (user_id, created_at DESC);

ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sessions_investor_own" ON public.active_sessions;
CREATE POLICY "sessions_investor_own"
  ON public.active_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "sessions_staff_all" ON public.active_sessions;
CREATE POLICY "sessions_staff_all"
  ON public.active_sessions
  FOR ALL
  USING (public.is_staff());

-- ── 4. Fix notifications CHECK to include 'profile_update' type ───────────────
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'deposit_status',
    'withdrawal_status',
    'new_withdrawal',
    'message',
    'system_alert',
    'manager_assigned',
    'profile_update'
  ));
