-- Migration 019: Legal Documents
-- Stores investor-assigned legal documents with Supabase Storage paths.
-- Storage bucket "legal-documents" must be created manually in the Supabase
-- dashboard as a PRIVATE bucket (not public) before uploads will work.

-- ── Table ──────────────────────────────────────────────────────────────────────

CREATE TABLE legal_documents (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text        NOT NULL,
  doc_type     text        NOT NULL
                           CHECK (doc_type IN ('agreement','contract','bank','legal')),
  description  text        NOT NULL DEFAULT '',
  storage_path text        NOT NULL,           -- path inside the legal-documents bucket
  assigned_to  uuid        NOT NULL REFERENCES deposit_users(id) ON DELETE CASCADE,
  uploaded_by  uuid        REFERENCES deposit_users(id) ON DELETE SET NULL,
  is_read      boolean     NOT NULL DEFAULT false,
  read_at      timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ────────────────────────────────────────────────────────────────────

CREATE INDEX legal_documents_assigned_to_idx ON legal_documents(assigned_to);
CREATE INDEX legal_documents_doc_type_idx    ON legal_documents(doc_type);

-- ── RLS ────────────────────────────────────────────────────────────────────────

ALTER TABLE legal_documents ENABLE ROW LEVEL SECURITY;

-- Investors: read only their own documents
CREATE POLICY "investor_select_own_legal_docs"
  ON legal_documents FOR SELECT
  USING (assigned_to = auth.uid());

-- Staff: full access
CREATE POLICY "staff_all_legal_docs"
  ON legal_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM deposit_users
      WHERE id = auth.uid() AND role != 'investor'
    )
  );

-- ── Notifications: add document_assigned type ──────────────────────────────────
-- Drop and recreate the CHECK constraint to add 'document_assigned'

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN (
    'deposit_approved','deposit_rejected',
    'withdrawal_approved','withdrawal_rejected',
    'new_withdrawal',
    'profile_update',
    'document_assigned',
    'general'
  ));
