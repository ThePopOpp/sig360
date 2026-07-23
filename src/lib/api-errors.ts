/**
 * Maps thrown data-layer errors to HTTP responses so route handlers don't
 * each repeat the same try/catch ladder.
 *
 *   try { ... } catch (err) { return toErrorResponse(err); }
 */
import { NextResponse } from 'next/server';
import {
  ForbiddenError,
  NotFoundError,
  TableMissingError,
  ValidationError,
} from '@/lib/db-errors';

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof TableMissingError) {
    return NextResponse.json({ error: err.message }, { status: 503 });
  }
  if (err instanceof ValidationError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof ForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  if (err instanceof NotFoundError) {
    return NextResponse.json({ error: err.message }, { status: 404 });
  }
  return NextResponse.json({ error: (err as Error)?.message ?? 'Unexpected error' }, { status: 500 });
}

/**
 * The legacy single-admin cookie resolves to a synthetic RbacUser with no
 * sig_profiles row, so it has no id to hang employee records off. Features
 * that write per-employee rows must reject it with a real explanation rather
 * than an FK violation.
 */
export const LEGACY_ADMIN_ID = 'legacy-admin';

export function requireRealProfile(userId: string): NextResponse | null {
  if (userId === LEGACY_ADMIN_ID) {
    return NextResponse.json(
      {
        error:
          'This action needs a real user profile. Sign in with your Supabase account rather than the legacy admin login.',
      },
      { status: 409 },
    );
  }
  return null;
}
