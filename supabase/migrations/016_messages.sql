-- ============================================================================
-- Phase 6 + 15 — Messaging (Concierge + Admin Inbox)
-- Formalizes the pre-existing messages table in migrations, adds RLS policies
-- and an index. The CREATE TABLE IF NOT EXISTS is a safe no-op since the table
-- already existed; all policy statements use DROP IF EXISTS first.
-- Also fixes the notifications CHECK constraint to include new_withdrawal,
-- which was added by Phase 5+13 code but never reflected in the constraint.
-- ============================================================================

-- ── 1. messages table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.messages (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id      uuid        NOT NULL,
  investor_name    text        NOT NULL DEFAULT '',
  sender_role      text        NOT NULL CHECK (sender_role IN ('investor', 'admin')),
  body             text        NOT NULL,
  read_by_investor boolean     NOT NULL DEFAULT false,
  read_by_admin    boolean     NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_investor_idx
  ON public.messages (investor_id, created_at ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Investors: read + insert their own thread only; cannot impersonate another user.
-- investor_id is text in dev (pre-migration column) but uuid in fresh
-- environments where this migration's CREATE ran — cast both sides to text
-- so the policy works against either column type.
DROP POLICY IF EXISTS "messages_investor_own" ON public.messages;
CREATE POLICY "messages_investor_own"
  ON public.messages
  USING (investor_id::text = auth.uid()::text)
  WITH CHECK (investor_id::text = auth.uid()::text AND sender_role = 'investor');

-- Staff: full access to every thread (read + write as admin)
DROP POLICY IF EXISTS "messages_staff_all" ON public.messages;
CREATE POLICY "messages_staff_all"
  ON public.messages
  USING (public.is_staff());

-- ── 2. Fix notifications CHECK constraint ─────────────────────────────────────
-- new_withdrawal was introduced by Phase 5+13 code but was missing from the
-- original CHECK added by migration 005. Drop and recreate to add it.
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
    'manager_assigned'
  ));
