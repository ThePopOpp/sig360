/**
 * Shared Supabase error handling for sig_* data-access modules.
 *
 * Mirrors the conventions established in src/lib/rbac/profiles.ts so every
 * table module degrades the same way when a migration hasn't been applied:
 * throw TableMissingError and let the route return a "provision the database"
 * 503 instead of an opaque 500.
 *
 * server-only: used by modules that touch the service-role client.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function isUuid(v: string | null | undefined): v is string {
  return !!v && UUID_RE.test(v);
}

/** Thrown when the underlying table/bucket isn't provisioned yet. */
export class TableMissingError extends Error {
  constructor(what = 'A required table') {
    super(`${what} is not provisioned. Apply the latest Supabase migration.`);
    this.name = 'TableMissingError';
  }
}

/** Thrown on validation problems (surface as 400). */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/** Thrown when the caller may not act on this record (surface as 403). */
export class ForbiddenError extends Error {
  constructor(message = 'Not permitted') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Thrown when a record doesn't exist (surface as 404). */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export interface PgError {
  code?: string;
  message?: string;
}

export function isUndefinedTable(err: PgError | null): boolean {
  if (!err) return false;
  return err.code === '42P01' || /relation .* does not exist/i.test(err.message ?? '');
}

/** Normalize a Supabase error into the right thrown type. Never returns. */
export function raise(err: PgError | null, what?: string): never {
  if (isUndefinedTable(err)) throw new TableMissingError(what);
  throw new Error(err?.message ?? 'Supabase query failed');
}
