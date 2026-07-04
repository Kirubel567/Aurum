-- ============================================================================
-- Migration 003 — PHASE -1, PART A: Safe Prep (no dependency on deposit_users.id
--                  being a native uuid type yet)
-- ============================================================================
-- Aurum Sovereign Capital — Backend Master Blueprint, Sections B, C, D, and E.
--
-- WHY THIS FILE WAS SPLIT (read before running):
-- A full schema introspection of dev revealed two facts that change the
-- sequencing of this whole phase:
--   1. deposit_users.id is `text`, not `uuid`, with no default — IDs are
--      generated in application code. Every ledger table in this system
--      needs a `uuid` foreign key into deposit_users(id), and the identity
--      FK to auth.users(id) needs the same. None of that can be created
--      while deposit_users.id is still text.
--   2. auth.users has ZERO rows in dev. No account — not even the existing
--      admin — has gone through real Supabase Auth yet.
-- The Section D backfill (create a real auth.users row per deposit_users
-- row via the Admin API, then repoint deposit_users.id to match) has to run
-- BETWEEN this file and the next one. This file only contains work that is
-- safe regardless of whether that backfill has happened yet:
--   - extensions & enum types
--   - converting deposit_users.role from text+CHECK to the real enum
--   - relaxing legacy NOT NULL constraints that would otherwise block future
--     signups once the auto-provisioning trigger goes live (part B)
--   - a one-time helper RPC the backfill script calls to atomically repoint
--     a user's id everywhere it's referenced
--
-- RUN ORDER: this file (003) -> scripts/backfill-dev-auth-users.mjs -> 004.
-- ============================================================================


-- ============================================================================
-- SECTION 1 — EXTENSIONS & DATA TYPES
-- ============================================================================

-- gen_random_uuid() has been a built-in core function since PostgreSQL 13,
-- so neither extension is strictly required on a modern Supabase project.
-- Enabled anyway as a harmless, commonly-expected baseline.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── user_role ────────────────────────────────────────────────────────────────
-- The three-tier RBAC model (Blueprint Section B.1):
--   investor    — owns and can only ever see their own data
--   admin       — "Account Manager": full read access to investor analytics
--                 and chat, zero financial mutation rights
--   super_admin — "Platform Controller": the only role that can approve
--                 money movement, override balances, or manage other admins
DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('investor', 'admin', 'super_admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── transaction_status ───────────────────────────────────────────────────────
-- Shared by deposits and withdrawals at this foundational layer. Postgres
-- enums can be extended non-destructively later (ALTER TYPE ... ADD VALUE),
-- so a richer withdrawal lifecycle (processing, completed) gets added when
-- Phase 5/13 actually need it, not speculatively invented now.
DO $$
BEGIN
  CREATE TYPE transaction_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ── ledger_entry_type ────────────────────────────────────────────────────────
-- Same non-destructive-extension logic applies: 'yield_credit'/'trade_pl'/
-- 'fee' style entry types get added via ALTER TYPE when Phase 1 (yield
-- accrual) and Phase 11 (trading console) are actually implemented.
DO $$
BEGIN
  CREATE TYPE ledger_entry_type AS ENUM ('deposit', 'withdrawal', 'interest_credit', 'correction');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;


-- ============================================================================
-- SECTION 2 — deposit_users PREP (everything that does NOT need id to be uuid)
-- ============================================================================

-- ── 2a. Convert deposit_users.role from text+CHECK (migration 002) to the
--        real user_role enum, extending it to include super_admin. ──────────
ALTER TABLE deposit_users DROP CONSTRAINT IF EXISTS deposit_users_role_check;

ALTER TABLE deposit_users
  ALTER COLUMN role DROP DEFAULT;

ALTER TABLE deposit_users
  ALTER COLUMN role TYPE user_role USING role::user_role;

ALTER TABLE deposit_users
  ALTER COLUMN role SET DEFAULT 'investor';

-- ── 2b. Relax legacy NOT NULL constraints that would block the
--        auto-provisioning trigger in migration 004. Real column names,
--        confirmed against dev's actual schema:
--          - "password"  (the old bcrypt hash — GoTrue owns password
--            storage entirely once Supabase Auth is live; this app-level
--            column becomes optional, not deleted, so nothing existing
--            breaks and the data is still there for reference/audit)
--          - "full_name" (onboarding collects this after signup; the
--            provisioning trigger fires at the moment of signup, before
--            that data exists yet)
--        Both are guarded with an existence check so this is a safe no-op
--        if either column is ever renamed or removed later. ────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deposit_users' AND column_name = 'password'
  ) THEN
    EXECUTE 'ALTER TABLE public.deposit_users ALTER COLUMN password DROP NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'deposit_users' AND column_name = 'full_name'
  ) THEN
    EXECUTE 'ALTER TABLE public.deposit_users ALTER COLUMN full_name DROP NOT NULL';
  END IF;
END $$;

-- Note: this project's account-status field is "deposit_status" (already
-- exists, NOT NULL, default 'none'), not "status" — an earlier draft of
-- this migration assumed a "status" column that doesn't actually exist and
-- would have created a redundant, disconnected column. Nothing in this
-- migration touches deposit_status; every later phase's Backend Logic
-- description should reference deposit_users.deposit_status, not "status".


-- ============================================================================
-- SECTION 3 — ONE-TIME BACKFILL HELPER
-- ============================================================================

-- Called exclusively by scripts/backfill-dev-auth-users.mjs, once per
-- existing deposit_users row, immediately after that script creates the
-- matching auth.users row via the Admin API. Atomically repoints the user's
-- id everywhere it's referenced in this schema today (deposit_users.id
-- itself, plus messages.investor_id — the only other place a deposit_users
-- id is stored, and it has no formal FK constraint, so nothing would
-- enforce this consistency automatically). This function works fine while
-- deposit_users.id is still `text`, because it's writing a new value into
-- that same text column, not changing the column's type.
--
-- Safe to run manually re-run per user (idempotent: if p_old_id no longer
-- exists because it was already repointed, it raises a clear NOT FOUND
-- error rather than silently doing nothing).
--
-- Optional cleanup: this function can be dropped after the backfill is
-- confirmed complete (DROP FUNCTION public.backfill_repoint_user_id(text, uuid);)
-- — it has no ongoing purpose once every account has been migrated.
CREATE OR REPLACE FUNCTION public.backfill_repoint_user_id(p_old_id text, p_new_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.deposit_users SET id = p_new_id::text WHERE id = p_old_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'BACKFILL_NO_SUCH_ROW: no deposit_users row found with id = %', p_old_id;
  END IF;

  UPDATE public.messages SET investor_id = p_new_id::text WHERE investor_id = p_old_id;
END;
$$;

COMMENT ON FUNCTION public.backfill_repoint_user_id(text, uuid) IS
  'One-time Section D backfill utility. Called by scripts/backfill-dev-auth-users.mjs to atomically move a user id from its old app-generated text value to the real auth.users.id created for them. Safe to drop once the backfill is complete.';

-- ============================================================================
-- END OF MIGRATION 003 — next step is scripts/backfill-dev-auth-users.mjs,
-- then migration 004.
-- ============================================================================
