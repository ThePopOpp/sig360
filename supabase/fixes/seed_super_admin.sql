-- ────────────────────────────────────────────────────────────
-- Seed a super_admin profile for the real Supabase Auth account.
--
-- Symptom this fixes: after logging in you see only "Notes" and
-- "Account" in the sidebar. Cause: sig_profiles is empty, so your
-- authenticated account has no role and therefore no permissions.
--
-- This links a super_admin sig_profiles row to the existing auth user
-- jeremy@strategicincomegroup.com. Idempotent: re-running updates the
-- same row rather than creating duplicates.
--
-- Run in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/kdbuutsjgzwnzgqxqrkw/sql/new
-- ────────────────────────────────────────────────────────────

INSERT INTO sig_profiles (auth_user_id, email, first_name, display_name, role, status, is_internal_user, can_login)
SELECT u.id, u.email, 'Jeremy', 'Jeremy', 'super_admin', 'active', true, true
FROM auth.users u
WHERE lower(u.email) = 'jeremy@strategicincomegroup.com'
ON CONFLICT (auth_user_id) DO UPDATE
  SET role = 'super_admin',
      status = 'active',
      is_internal_user = true,
      can_login = true;

-- Verify:
SELECT email, role, status, (auth_user_id IS NOT NULL) AS auth_linked
FROM sig_profiles
WHERE lower(email) = 'jeremy@strategicincomegroup.com';
