-- Migration 001: Add user_role enum (+ legacy profiles wiring where present)
-- Pattern A: Admin accounts are created manually by developers.
-- No self-registration for admin.
--
-- The "profiles" table only ever existed in the dev project (an early
-- Supabase-auth experiment). Everything profiles-related is wrapped in an
-- existence guard so this migration also applies cleanly to environments
-- that never had it (production). The user_role enum is the only part the
-- rest of the migration chain actually depends on.

-- 1. Role enum ---------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('investor', 'admin');

-- 2–5. Legacy profiles table wiring (dev only — skipped when absent) ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE NOTICE 'profiles table not present — skipping legacy profiles wiring.';
    RETURN;
  END IF;

  ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'investor';

  CREATE OR REPLACE FUNCTION public.get_my_role()
  RETURNS text
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS 'SELECT role::text FROM public.profiles WHERE id = auth.uid();';

  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

  CREATE POLICY "profiles_select_admin"
    ON public.profiles FOR SELECT
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );

  CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = 'investor');

  CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    USING (
      (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
    );
END $$;
