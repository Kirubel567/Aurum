-- ============================================================================
-- Phase 7 — AI Support Chat (/support)
-- Creates ai_chat_sessions and ai_chat_messages tables with RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES public.deposit_users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_sessions_user_idx
  ON public.ai_chat_sessions (user_id, created_at DESC);

ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_sessions_investor_own" ON public.ai_chat_sessions;
CREATE POLICY "chat_sessions_investor_own"
  ON public.ai_chat_sessions
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "chat_sessions_staff_read" ON public.ai_chat_sessions;
CREATE POLICY "chat_sessions_staff_read"
  ON public.ai_chat_sessions
  FOR SELECT
  USING (public.is_staff());

-- ── ai_chat_messages ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.ai_chat_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES public.ai_chat_sessions(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('user', 'assistant')),
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_chat_messages_session_idx
  ON public.ai_chat_messages (session_id, created_at ASC);

ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_investor_own" ON public.ai_chat_messages;
CREATE POLICY "chat_messages_investor_own"
  ON public.ai_chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_chat_sessions s
      WHERE s.id = session_id AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "chat_messages_staff_read" ON public.ai_chat_messages;
CREATE POLICY "chat_messages_staff_read"
  ON public.ai_chat_messages
  FOR SELECT
  USING (public.is_staff());
