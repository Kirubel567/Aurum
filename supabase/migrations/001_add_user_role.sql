-- Migration 001: Add user_role to profiles table
-- Pattern A: Admin accounts are created manually by developers.
-- No self-registration for admin. Developers run the UPDATE below per account.
--
-- Prerequisites: a "profiles" table that mirrors auth.users (id = auth.uid()).
-- If your table has a different name, replace "profiles" throughout.

-- 1. Role enum ---------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('investor', 'admin');

-- 2. Add role column (safe to re-run: IF NOT EXISTS) -------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'investor';

-- 3. Promote a user to admin (run once per admin account) --------------------
--    Replace <user-uuid> with the UUID from auth.users / Supabase dashboard.
--
--    UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';

-- 4. Helper readable by the application layer --------------------------------
--    Called from middleware / server actions to read the current user's role
--    without exposing the full profiles table.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_my_role() IS
  'Returns the role of the currently authenticated Supabase user.
   Returns NULL when no session exists. Used by Next.js middleware for
   role-based route protection (/admin/* requires admin role).';

-- 5. Row Level Security (enable + basic policies) ----------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Each user reads their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Admins can read every profile (needed for /admin/users)
CREATE POLICY "profiles_select_admin"
  ON profiles FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );

-- Users update their own profile, but cannot change their own role
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND role = 'investor');

-- Admins can update any profile (including role changes)
CREATE POLICY "profiles_update_admin"
  ON profiles FOR UPDATE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
