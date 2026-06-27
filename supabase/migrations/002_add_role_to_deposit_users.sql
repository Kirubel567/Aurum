-- Migration 002: Add role column to deposit_users table
-- This supports Pattern A admin access: developer creates admin accounts manually.
-- Run this in the Supabase SQL editor BEFORE creating any admin accounts.

ALTER TABLE deposit_users
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'investor'
    CHECK (role IN ('investor', 'admin'));

CREATE INDEX IF NOT EXISTS deposit_users_role_idx ON deposit_users (role);

-- To promote an existing user to admin:
--   UPDATE deposit_users SET role = 'admin' WHERE email = 'admin@example.com';
