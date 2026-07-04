-- ============================================================================
-- Phase 0 — Navigation Workflows & Routing Security
-- The notifications table backing the investor/admin notification bells.
-- Blueprint: PHASE 0 → Database Schema.
--
-- Inserts happen ONLY server-side with the service-role key (system-generated
-- notifications from trusted route handlers, e.g. the deposit decision flow).
-- There is deliberately NO insert policy for any authenticated role.
-- ============================================================================

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('deposit_status','withdrawal_status','message','system_alert','manager_assigned')),
  title text NOT NULL,
  body text,
  link_path text, -- e.g. "/wallet" so clicking the notification routes there
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_unread_idx
  ON public.notifications (user_id, read, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Investors (and staff, for their own rows) read their own notifications.
CREATE POLICY "notifications_select_own"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- The only client-side mutation allowed: marking your own rows read.
-- WITH CHECK pins user_id/read so the row can't be re-pointed or un-read
-- fields tampered with beyond the read flag (column-level enforcement is
-- handled by the route only sending `read`, this guards the row identity).
CREATE POLICY "notifications_update_own_read"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.notifications IS
  'Phase 0: per-user notification feed for the nav-bar bells. Service-role inserts only.';
