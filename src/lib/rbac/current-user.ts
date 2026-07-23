/**
 * Current-user seam.
 *
 * Resolution order:
 *   1. Supabase Auth session (real per-user account) → its sig_profiles row
 *      supplies the real role + permissions.
 *   2. Legacy single-admin cookie → treated as super_admin so the owner is
 *      never locked out during/after the auth cutover.
 *
 * This is the ONE place that maps a live session to an RbacUser. When the
 * legacy admin is fully retired, delete the step-2 fallback and this file is
 * the only thing that changes.
 */
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createSupabaseServerClient, isSupabaseAuthConfigured } from '@/lib/supabase-server';
import { ROLES, isRole, type Role } from './roles';
import { USER_STATUSES, type UserStatus } from './user-statuses';
import type { RbacUser } from './types';

export interface SessionIdentity {
  email: string;
  name?: string;
  source: 'supabase' | 'legacy';
}

/** Who is making this request (Supabase session first, then legacy cookie). */
export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  if (isSupabaseAuthConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user?.email) {
        const meta = (data.user.user_metadata ?? {}) as { name?: string; full_name?: string };
        return { email: data.user.email, name: meta.name || meta.full_name, source: 'supabase' };
      }
    } catch {
      // fall through to legacy
    }
  }
  const session = await getSession();
  if (session?.user?.email) {
    return { email: session.user.email, name: session.user.name, source: 'legacy' };
  }
  return null;
}

async function loadProfileByEmail(email: string): Promise<RbacUser | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('sig_profiles')
      .select(
        'id, email, role, status, extra_permissions, revoked_permissions, client_id, household_id',
      )
      .ilike('email', email)
      .maybeSingle();

    if (error || !data) return null;

    const role: Role = isRole(data.role) ? data.role : ROLES.SUPPORT_OPERATIONS;
    return {
      id: data.id,
      email: data.email,
      role,
      status: (data.status as UserStatus) ?? USER_STATUSES.ACTIVE,
      extraPermissions: data.extra_permissions ?? [],
      revokedPermissions: data.revoked_permissions ?? [],
      clientId: data.client_id ?? null,
      householdId: data.household_id ?? null,
    };
  } catch {
    // sig_profiles not migrated yet, or Supabase unconfigured.
    return null;
  }
}

/**
 * Resolve the current RbacUser, or null if unauthenticated / unprovisioned.
 * Server-only.
 */
export async function getCurrentRbacUser(): Promise<RbacUser | null> {
  const identity = await getSessionIdentity();
  if (!identity) return null;

  const profile = await loadProfileByEmail(identity.email);
  if (profile) return profile;

  // Legacy admin with no profile row yet → super_admin so the dashboard keeps
  // working until /api/me seeds their profile. A Supabase-authenticated user
  // with no profile has no access (returns null).
  if (identity.source === 'legacy') {
    return {
      id: 'legacy-admin',
      email: identity.email,
      role: ROLES.SUPER_ADMIN,
      status: USER_STATUSES.ACTIVE,
      extraPermissions: [],
      revokedPermissions: [],
      clientId: null,
      householdId: null,
    };
  }
  return null;
}
