-- Migration 020: Fix notifications CHECK constraint
--
-- Migration 019 mistakenly replaced the real notification type list
-- (established in 005, extended in 017) with an invented one, which made
-- every insertNotification() call in the app silently fail (the helper
-- logs and swallows insert errors by design). 019's UPDATE also flattened
-- existing rows' types to 'general'.
--
-- This migration: restores the correct list (017's seven types plus
-- 'document_assigned' from Phase 8 and 'general' for rows already
-- flattened), and best-effort re-derives types for the flattened rows
-- from their titles.

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Re-derive flattened types. Only rows currently 'general' can have come
-- from 019's normalisation ('general' was never a permitted value before).
UPDATE public.notifications SET type = 'deposit_status'
  WHERE type = 'general' AND title ILIKE '%deposit%';
UPDATE public.notifications SET type = 'withdrawal_status'
  WHERE type = 'general' AND title ILIKE '%withdraw%';
UPDATE public.notifications SET type = 'message'
  WHERE type = 'general' AND title ILIKE '%message%';
UPDATE public.notifications SET type = 'manager_assigned'
  WHERE type = 'general' AND title ILIKE '%manager%';

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'deposit_status',
    'withdrawal_status',
    'new_withdrawal',
    'message',
    'system_alert',
    'manager_assigned',
    'profile_update',
    'document_assigned',
    'general'
  ));
