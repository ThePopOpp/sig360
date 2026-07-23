-- ════════════════════════════════════════════════════════════
-- Employee expenses + employee document portal
--
-- Two related staff-facing features:
--   1. sig_expenses          — expense log (mileage + other categories)
--                              with a submit → approve → reimburse workflow.
--   2. sig_employee_documents — per-employee compliance documents
--      sig_document_requirements — the admin-managed list of what's required.
--
-- Enum values here are mirrored in src/lib/rbac/* and src/lib/expenses.ts /
-- src/lib/employee-documents.ts. Keep the two in lockstep.
--
-- Style follows 20260707000003_redtail_mirror.sql: sig_ prefix everywhere,
-- idempotent DDL, sig_set_updated_at() redefined so this file stands alone.
-- ════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Redefined locally so this migration can be applied standalone.
CREATE OR REPLACE FUNCTION sig_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- The RLS predicates below. sig_is_admin() comes from the RBAC migration and
-- sig_is_active_internal() from the Redtail one; both are (re)defined here,
-- defensively and identically, so this migration does not depend on the order
-- the others were applied in.
CREATE OR REPLACE FUNCTION sig_is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM sig_profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role IN ('super_admin', 'owner_leadership', 'admin')
      AND p.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- True when the current auth user is an active internal SIG staff member.
CREATE OR REPLACE FUNCTION sig_is_active_internal()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM sig_profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.is_internal_user = true
      AND p.status = 'active'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ─── ENUMS ────────────────────────────────────────────────
-- CREATE TYPE has no IF NOT EXISTS; guard via catalog lookup.
DO $$ BEGIN
  CREATE TYPE sig_expense_category AS ENUM (
    'mileage',
    'meals',
    'travel',
    'lodging',
    'supplies',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sig_expense_status AS ENUM (
    'draft',
    'submitted',
    'approved',
    'rejected',
    'reimbursed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sig_employee_doc_status AS ENUM (
    'pending',
    'verified',
    'rejected'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── MILEAGE RATES ────────────────────────────────────────
-- Cents-per-mile by effective date, so historical trips keep the rate that
-- applied when they happened (IRS revises this annually). The rate in force
-- for a trip is the newest row with effective_from <= the trip date.
CREATE TABLE IF NOT EXISTS sig_mileage_rates (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_cents     integer     NOT NULL CHECK (rate_cents > 0),
  effective_from date        NOT NULL UNIQUE,
  note           text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sig_mileage_rates_effective_from
  ON sig_mileage_rates (effective_from DESC);
DROP TRIGGER IF EXISTS sig_mileage_rates_updated_at ON sig_mileage_rates;
CREATE TRIGGER sig_mileage_rates_updated_at
  BEFORE UPDATE ON sig_mileage_rates FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

-- Placeholder starting rate — CONFIRM against the current IRS standard
-- mileage rate and correct via the admin UI before employees log trips.
INSERT INTO sig_mileage_rates (rate_cents, effective_from, note)
VALUES (70, DATE '2026-01-01', 'Seed value — verify against the current IRS standard rate.')
ON CONFLICT (effective_from) DO NOTHING;

-- ─── EXPENSES ─────────────────────────────────────────────
-- One row per expense line. Mileage rows carry miles + rate_cents and derive
-- their value; every other category carries amount_cents directly. total_cents
-- is generated so the two can never disagree.
CREATE TABLE IF NOT EXISTS sig_expenses (
  id             uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid                 NOT NULL REFERENCES sig_profiles(id) ON DELETE CASCADE,

  category       sig_expense_category NOT NULL,
  expense_date   date                 NOT NULL,
  description    text                 NOT NULL,
  notes          text,

  -- Mileage-only.
  miles          numeric(10,2)        CHECK (miles IS NULL OR miles > 0),
  rate_cents     integer              CHECK (rate_cents IS NULL OR rate_cents > 0),
  from_location  text,
  to_location    text,

  -- Non-mileage only.
  amount_cents   integer              CHECK (amount_cents IS NULL OR amount_cents >= 0),

  total_cents    integer GENERATED ALWAYS AS (
    CASE
      WHEN category = 'mileage'
        THEN (round(COALESCE(miles, 0) * COALESCE(rate_cents, 0)))::int
      ELSE COALESCE(amount_cents, 0)
    END
  ) STORED,

  -- Optional receipt in the employee-documents bucket.
  receipt_path   text,
  receipt_name   text,

  status         sig_expense_status   NOT NULL DEFAULT 'draft',
  submitted_at   timestamptz,
  reviewed_by    uuid                 REFERENCES sig_profiles(id) ON DELETE SET NULL,
  reviewed_at    timestamptz,
  review_note    text,
  reimbursed_at  timestamptz,

  created_at     timestamptz          NOT NULL DEFAULT now(),
  updated_at     timestamptz          NOT NULL DEFAULT now(),

  -- Mileage needs miles + rate; everything else needs an amount.
  CONSTRAINT sig_expenses_shape CHECK (
    (category =  'mileage' AND miles IS NOT NULL AND rate_cents IS NOT NULL)
    OR
    (category <> 'mileage' AND amount_cents IS NOT NULL)
  )
);
CREATE INDEX IF NOT EXISTS idx_sig_expenses_profile_id ON sig_expenses (profile_id);
CREATE INDEX IF NOT EXISTS idx_sig_expenses_status     ON sig_expenses (status);
CREATE INDEX IF NOT EXISTS idx_sig_expenses_date       ON sig_expenses (expense_date DESC);
DROP TRIGGER IF EXISTS sig_expenses_updated_at ON sig_expenses;
CREATE TRIGGER sig_expenses_updated_at
  BEFORE UPDATE ON sig_expenses FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

-- ─── DOCUMENT REQUIREMENTS ────────────────────────────────
-- The admin-managed catalog of documents employees must supply.
-- required_roles empty = required of every internal employee; otherwise the
-- requirement only applies to the listed roles.
CREATE TABLE IF NOT EXISTS sig_document_requirements (
  id              uuid            PRIMARY KEY DEFAULT gen_random_uuid(),
  key             text            NOT NULL UNIQUE,
  name            text            NOT NULL,
  description     text,
  category        text            NOT NULL DEFAULT 'other',
  requires_expiry boolean         NOT NULL DEFAULT false,
  required_roles  sig_user_role[] NOT NULL DEFAULT '{}',
  is_active       boolean         NOT NULL DEFAULT true,
  sort_order      integer         NOT NULL DEFAULT 0,
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sig_document_requirements_active
  ON sig_document_requirements (is_active, sort_order);
DROP TRIGGER IF EXISTS sig_document_requirements_updated_at ON sig_document_requirements;
CREATE TRIGGER sig_document_requirements_updated_at
  BEFORE UPDATE ON sig_document_requirements
  FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

-- Starter catalog. Admins can edit/deactivate these and add their own.
INSERT INTO sig_document_requirements (key, name, description, category, requires_expiry, sort_order) VALUES
  ('auto_insurance',      'Auto Insurance',            'Current proof of personal auto insurance coverage.',      'insurance', true,  10),
  ('drivers_license',     'Driver''s License',         'Valid state-issued driver''s license.',                   'driving',   true,  20),
  ('driving_record',      'Driving Record (MVR)',      'Motor vehicle record pulled within the last 12 months.',  'driving',   true,  30),
  ('employment_agreement','Employment Agreement',      'Signed employment agreement.',                            'agreement', false, 40),
  ('handbook_ack',        'Handbook Acknowledgement',  'Signed acknowledgement of the employee handbook.',        'agreement', false, 50),
  ('confidentiality',     'Confidentiality Agreement', 'Signed confidentiality / NDA agreement.',                 'agreement', false, 60),
  ('w4',                  'Form W-4',                  'Current federal withholding certificate.',               'tax',       false, 70),
  ('i9',                  'Form I-9',                  'Employment eligibility verification.',                   'tax',       false, 80)
ON CONFLICT (key) DO NOTHING;

-- ─── EMPLOYEE DOCUMENTS ───────────────────────────────────
-- The employee's uploaded file for a given requirement. One current row per
-- (profile, requirement) — re-uploading replaces the file and resets review.
CREATE TABLE IF NOT EXISTS sig_employee_documents (
  id             uuid                    PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id     uuid                    NOT NULL REFERENCES sig_profiles(id) ON DELETE CASCADE,
  requirement_id uuid                    NOT NULL REFERENCES sig_document_requirements(id) ON DELETE CASCADE,

  file_path      text                    NOT NULL,
  file_name      text                    NOT NULL,
  content_type   text,
  size_bytes     integer,

  issued_on      date,
  expires_on     date,

  status         sig_employee_doc_status NOT NULL DEFAULT 'pending',
  verified_by    uuid                    REFERENCES sig_profiles(id) ON DELETE SET NULL,
  verified_at    timestamptz,
  review_note    text,

  uploaded_at    timestamptz             NOT NULL DEFAULT now(),
  created_at     timestamptz             NOT NULL DEFAULT now(),
  updated_at     timestamptz             NOT NULL DEFAULT now(),

  UNIQUE (profile_id, requirement_id)
);
CREATE INDEX IF NOT EXISTS idx_sig_employee_documents_profile_id ON sig_employee_documents (profile_id);
CREATE INDEX IF NOT EXISTS idx_sig_employee_documents_status     ON sig_employee_documents (status);
CREATE INDEX IF NOT EXISTS idx_sig_employee_documents_expires_on ON sig_employee_documents (expires_on);
DROP TRIGGER IF EXISTS sig_employee_documents_updated_at ON sig_employee_documents;
CREATE TRIGGER sig_employee_documents_updated_at
  BEFORE UPDATE ON sig_employee_documents
  FOR EACH ROW EXECUTE FUNCTION sig_set_updated_at();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────
-- Server code uses the service-role key (bypasses RLS). These protect any
-- client-side/anon access and prepare for direct Supabase Auth reads.
ALTER TABLE sig_mileage_rates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE sig_expenses              ENABLE ROW LEVEL SECURITY;
ALTER TABLE sig_document_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE sig_employee_documents    ENABLE ROW LEVEL SECURITY;

-- Maps auth.uid() → sig_profiles.id. Needed because sig_profiles.id is NOT
-- auth.users.id; the link is the separate auth_user_id column.
CREATE OR REPLACE FUNCTION sig_current_profile_id()
RETURNS uuid AS $$
  SELECT id FROM sig_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Mileage rates: any active internal user reads, admins write.
DROP POLICY IF EXISTS sig_mileage_rates_read ON sig_mileage_rates;
CREATE POLICY sig_mileage_rates_read ON sig_mileage_rates
  FOR SELECT USING (sig_is_active_internal());
DROP POLICY IF EXISTS sig_mileage_rates_admin_write ON sig_mileage_rates;
CREATE POLICY sig_mileage_rates_admin_write ON sig_mileage_rates
  FOR ALL USING (sig_is_admin()) WITH CHECK (sig_is_admin());

-- Expenses: employees see and manage their own; admins see all.
DROP POLICY IF EXISTS sig_expenses_read ON sig_expenses;
CREATE POLICY sig_expenses_read ON sig_expenses
  FOR SELECT USING (sig_is_admin() OR profile_id = sig_current_profile_id());
DROP POLICY IF EXISTS sig_expenses_own_insert ON sig_expenses;
CREATE POLICY sig_expenses_own_insert ON sig_expenses
  FOR INSERT WITH CHECK (sig_is_admin() OR profile_id = sig_current_profile_id());
-- Employees may only edit an entry that has not been reviewed yet. USING gates
-- the row as it stands; WITH CHECK gates the row after the edit and must NOT
-- repeat the status test — submitting is a draft→submitted update, and an
-- omitted WITH CHECK defaults to USING, which would reject exactly that.
DROP POLICY IF EXISTS sig_expenses_own_update ON sig_expenses;
CREATE POLICY sig_expenses_own_update ON sig_expenses
  FOR UPDATE USING (
    sig_is_admin()
    OR (profile_id = sig_current_profile_id() AND status IN ('draft', 'rejected'))
  )
  WITH CHECK (sig_is_admin() OR profile_id = sig_current_profile_id());
DROP POLICY IF EXISTS sig_expenses_own_delete ON sig_expenses;
CREATE POLICY sig_expenses_own_delete ON sig_expenses
  FOR DELETE USING (
    sig_is_admin()
    OR (profile_id = sig_current_profile_id() AND status IN ('draft', 'rejected'))
  );

-- Requirements: every internal user reads the catalog; admins maintain it.
DROP POLICY IF EXISTS sig_document_requirements_read ON sig_document_requirements;
CREATE POLICY sig_document_requirements_read ON sig_document_requirements
  FOR SELECT USING (sig_is_active_internal());
DROP POLICY IF EXISTS sig_document_requirements_admin_write ON sig_document_requirements;
CREATE POLICY sig_document_requirements_admin_write ON sig_document_requirements
  FOR ALL USING (sig_is_admin()) WITH CHECK (sig_is_admin());

-- Employee documents: own or admin. Note employees cannot self-verify —
-- status transitions are done server-side by an admin-gated route.
DROP POLICY IF EXISTS sig_employee_documents_read ON sig_employee_documents;
CREATE POLICY sig_employee_documents_read ON sig_employee_documents
  FOR SELECT USING (sig_is_admin() OR profile_id = sig_current_profile_id());
DROP POLICY IF EXISTS sig_employee_documents_own_insert ON sig_employee_documents;
CREATE POLICY sig_employee_documents_own_insert ON sig_employee_documents
  FOR INSERT WITH CHECK (sig_is_admin() OR profile_id = sig_current_profile_id());
DROP POLICY IF EXISTS sig_employee_documents_own_update ON sig_employee_documents;
CREATE POLICY sig_employee_documents_own_update ON sig_employee_documents
  FOR UPDATE USING (sig_is_admin() OR profile_id = sig_current_profile_id())
  WITH CHECK (sig_is_admin() OR profile_id = sig_current_profile_id());
DROP POLICY IF EXISTS sig_employee_documents_admin_delete ON sig_employee_documents;
CREATE POLICY sig_employee_documents_admin_delete ON sig_employee_documents
  FOR DELETE USING (sig_is_admin() OR profile_id = sig_current_profile_id());

-- ─── STORAGE ──────────────────────────────────────────────
-- PRIVATE bucket — unlike profile-photos, these are driving records, insurance
-- certificates and signed agreements. Never public; reads go through
-- short-lived signed URLs minted server-side.
INSERT INTO storage.buckets (id, name, public)
VALUES ('employee-documents', 'employee-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Object paths are {profileId}/{requirementKey}/{filename}, so the first path
-- segment identifies the owner.
DROP POLICY IF EXISTS "employee_documents_owner_read" ON storage.objects;
CREATE POLICY "employee_documents_owner_read" ON storage.objects
  FOR SELECT TO authenticated USING (
    bucket_id = 'employee-documents'
    AND (
      sig_is_admin()
      OR (storage.foldername(name))[1] = sig_current_profile_id()::text
    )
  );

DROP POLICY IF EXISTS "employee_documents_owner_write" ON storage.objects;
CREATE POLICY "employee_documents_owner_write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      sig_is_admin()
      OR (storage.foldername(name))[1] = sig_current_profile_id()::text
    )
  );

DROP POLICY IF EXISTS "employee_documents_owner_update" ON storage.objects;
CREATE POLICY "employee_documents_owner_update" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'employee-documents'
    AND (
      sig_is_admin()
      OR (storage.foldername(name))[1] = sig_current_profile_id()::text
    )
  );

DROP POLICY IF EXISTS "employee_documents_owner_delete" ON storage.objects;
CREATE POLICY "employee_documents_owner_delete" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'employee-documents'
    AND (
      sig_is_admin()
      OR (storage.foldername(name))[1] = sig_current_profile_id()::text
    )
  );
