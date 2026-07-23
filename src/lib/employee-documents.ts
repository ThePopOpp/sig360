/**
 * Server-side data access for the employee document portal.
 *
 *   sig_document_requirements — admin-managed catalog of what staff must supply
 *   sig_employee_documents    — the file an employee uploaded for a requirement
 *
 * Files live in the PRIVATE `employee-documents` bucket (driving records,
 * insurance certificates, signed agreements). They are never public: reads go
 * through short-lived signed URLs minted here.
 *
 * Completeness — the definition behind the stat cards:
 *   a requirement is SATISFIED when a document exists, is verified, and is not
 *   past its expiry. Uploaded-but-unverified and verified-but-expired both
 *   count as incomplete.
 *
 * server-only: touches the service-role Supabase client.
 */
import { supabaseAdmin } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/rbac/audit';
import { INTERNAL_ROLES, type Role } from '@/lib/rbac/roles';
import { USER_STATUSES } from '@/lib/rbac/user-statuses';
import {
  NotFoundError,
  TableMissingError,
  ValidationError,
  isUuid,
  raise,
} from '@/lib/db-errors';

const REQ_TABLE = 'sig_document_requirements';
const DOC_TABLE = 'sig_employee_documents';
export const DOC_BUCKET = 'employee-documents';

/** How long a minted download link stays valid. */
const SIGNED_URL_TTL_SECONDS = 60;

/** A verified doc within this many days of expiry is flagged "expiring soon". */
export const EXPIRING_SOON_DAYS = 30;

const REQ_COLS =
  'id, key, name, description, category, requires_expiry, required_roles, is_active, sort_order, created_at, updated_at';
const DOC_COLS =
  'id, profile_id, requirement_id, file_path, file_name, content_type, size_bytes, ' +
  'issued_on, expires_on, status, verified_by, verified_at, review_note, uploaded_at, ' +
  'created_at, updated_at';

export const DOC_STATUSES = ['pending', 'verified', 'rejected'] as const;
export type DocStatus = (typeof DOC_STATUSES)[number];

/** Per-requirement state for one employee, as rendered in the portal. */
export type ComplianceState =
  | 'missing'
  | 'pending'
  | 'rejected'
  | 'expired'
  | 'expiring'
  | 'verified';

export const AUDIT_DOC_ACTIONS = {
  UPLOADED: 'employee_doc.uploaded',
  VERIFIED: 'employee_doc.verified',
  REJECTED: 'employee_doc.rejected',
  DELETED: 'employee_doc.deleted',
  REQUIREMENT_CHANGED: 'employee_doc.requirement_changed',
} as const;

export interface RequirementRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  requiresExpiry: boolean;
  /** Empty = required of every internal employee. */
  requiredRoles: Role[];
  isActive: boolean;
  sortOrder: number;
}

export interface EmployeeDocRow {
  id: string;
  profileId: string;
  requirementId: string;
  filePath: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  issuedOn: string | null;
  expiresOn: string | null;
  status: DocStatus;
  verifiedBy: string | null;
  verifiedAt: string | null;
  reviewNote: string | null;
  uploadedAt: string;
}

export interface Actor {
  id: string;
  email: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapReq(r: any): RequirementRow {
  return {
    id: r.id,
    key: r.key,
    name: r.name,
    description: r.description ?? null,
    category: r.category,
    requiresExpiry: r.requires_expiry,
    requiredRoles: (r.required_roles ?? []) as Role[],
    isActive: r.is_active,
    sortOrder: r.sort_order,
  };
}

function mapDoc(r: any): EmployeeDocRow {
  return {
    id: r.id,
    profileId: r.profile_id,
    requirementId: r.requirement_id,
    filePath: r.file_path,
    fileName: r.file_name,
    contentType: r.content_type ?? null,
    sizeBytes: r.size_bytes ?? null,
    issuedOn: r.issued_on ?? null,
    expiresOn: r.expires_on ?? null,
    status: r.status,
    verifiedBy: r.verified_by ?? null,
    verifiedAt: r.verified_at ?? null,
    reviewNote: r.review_note ?? null,
    uploadedAt: r.uploaded_at,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today as YYYY-MM-DD. Expiry is a calendar date, so compare as dates. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysUntil(dateIso: string): number {
  const ms = Date.parse(`${dateIso}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

// ─── Requirements ───────────────────────────────────────────

export async function listRequirements(
  opts: { includeInactive?: boolean } = {},
): Promise<RequirementRow[]> {
  let q = supabaseAdmin.from(REQ_TABLE).select(REQ_COLS);
  if (!opts.includeInactive) q = q.eq('is_active', true);

  const { data, error } = await q
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) raise(error, 'sig_document_requirements');
  return (data ?? []).map(mapReq);
}

/** Requirements that apply to a given role (empty required_roles = everyone). */
export function requirementsForRole(reqs: RequirementRow[], role: Role): RequirementRow[] {
  return reqs.filter((r) => r.requiredRoles.length === 0 || r.requiredRoles.includes(role));
}

export interface RequirementInput {
  key?: string;
  name: string;
  description?: string | null;
  category?: string;
  requiresExpiry?: boolean;
  requiredRoles?: Role[];
  isActive?: boolean;
  sortOrder?: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
}

export async function createRequirement(
  input: RequirementInput,
  actor: Actor,
): Promise<RequirementRow> {
  if (!input.name?.trim()) throw new ValidationError('Name is required.');
  const key = (input.key?.trim() || slugify(input.name)) as string;
  if (!key) throw new ValidationError('Could not derive a key from that name.');

  const { data, error } = await supabaseAdmin
    .from(REQ_TABLE)
    .insert({
      key,
      name: input.name.trim(),
      description: input.description ?? null,
      category: input.category ?? 'other',
      requires_expiry: input.requiresExpiry ?? false,
      required_roles: input.requiredRoles ?? [],
      is_active: input.isActive ?? true,
      sort_order: input.sortOrder ?? 0,
    })
    .select(REQ_COLS)
    .single();
  if (error) {
    if (error.code === '23505') {
      throw new ValidationError(`A requirement with key "${key}" already exists.`);
    }
    raise(error, 'sig_document_requirements');
  }
  const row = mapReq(data);

  await writeAuditLog({
    actorUserId: actor.id,
    action: AUDIT_DOC_ACTIONS.REQUIREMENT_CHANGED,
    entityType: 'document_requirement',
    entityId: row.id,
    newValue: { key: row.key, name: row.name },
  });
  return row;
}

export async function updateRequirement(
  id: string,
  input: Partial<RequirementInput>,
  actor: Actor,
): Promise<RequirementRow> {
  if (!isUuid(id)) throw new ValidationError('A valid requirement id is required.');

  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.category !== undefined) patch.category = input.category;
  if (input.requiresExpiry !== undefined) patch.requires_expiry = input.requiresExpiry;
  if (input.requiredRoles !== undefined) patch.required_roles = input.requiredRoles;
  if (input.isActive !== undefined) patch.is_active = input.isActive;
  if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;

  if (Object.keys(patch).length === 0) {
    throw new ValidationError('No fields to update.');
  }

  const { data, error } = await supabaseAdmin
    .from(REQ_TABLE)
    .update(patch)
    .eq('id', id)
    .select(REQ_COLS)
    .single();
  if (error) raise(error, 'sig_document_requirements');
  if (!data) throw new NotFoundError('Requirement not found.');

  await writeAuditLog({
    actorUserId: actor.id,
    action: AUDIT_DOC_ACTIONS.REQUIREMENT_CHANGED,
    entityType: 'document_requirement',
    entityId: id,
    newValue: patch,
  });
  return mapReq(data);
}

// ─── Documents ──────────────────────────────────────────────

export async function listDocumentsForProfile(profileId: string): Promise<EmployeeDocRow[]> {
  if (!isUuid(profileId)) return [];
  const { data, error } = await supabaseAdmin
    .from(DOC_TABLE)
    .select(DOC_COLS)
    .eq('profile_id', profileId);
  if (error) raise(error, 'sig_employee_documents');
  return (data ?? []).map(mapDoc);
}

export async function listAllDocuments(): Promise<EmployeeDocRow[]> {
  const { data, error } = await supabaseAdmin.from(DOC_TABLE).select(DOC_COLS);
  if (error) raise(error, 'sig_employee_documents');
  return (data ?? []).map(mapDoc);
}

export async function getDocument(id: string): Promise<EmployeeDocRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin
    .from(DOC_TABLE)
    .select(DOC_COLS)
    .eq('id', id)
    .maybeSingle();
  if (error) raise(error, 'sig_employee_documents');
  return data ? mapDoc(data) : null;
}

export interface UploadInput {
  bytes: Uint8Array;
  fileName: string;
  contentType: string;
  issuedOn?: string | null;
  expiresOn?: string | null;
}

/**
 * Store the file and upsert the employee's row for this requirement.
 * Re-uploading replaces the file and resets review back to `pending` — a new
 * document has not been checked by anyone yet.
 */
export async function uploadEmployeeDocument(
  profileId: string,
  requirementId: string,
  input: UploadInput,
  actor: Actor,
): Promise<EmployeeDocRow> {
  if (!isUuid(profileId)) throw new ValidationError('A valid profile id is required.');
  if (!isUuid(requirementId)) throw new ValidationError('A valid requirement id is required.');

  const { data: reqData, error: reqErr } = await supabaseAdmin
    .from(REQ_TABLE)
    .select(REQ_COLS)
    .eq('id', requirementId)
    .maybeSingle();
  if (reqErr) raise(reqErr, 'sig_document_requirements');
  if (!reqData) throw new NotFoundError('Requirement not found.');
  const requirement = mapReq(reqData);

  if (input.expiresOn && !DATE_RE.test(input.expiresOn)) {
    throw new ValidationError('expiresOn must be a YYYY-MM-DD date.');
  }
  if (input.issuedOn && !DATE_RE.test(input.issuedOn)) {
    throw new ValidationError('issuedOn must be a YYYY-MM-DD date.');
  }
  if (requirement.requiresExpiry && !input.expiresOn) {
    throw new ValidationError(`${requirement.name} requires an expiry date.`);
  }

  // {profileId}/{requirementKey}/{file} — the first segment is what the
  // storage RLS policy matches the owner on, so it must stay first.
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80) || 'document';
  const path = `${profileId}/${requirement.key}/${safeName}`;

  const { error: upErr } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .upload(path, input.bytes, { contentType: input.contentType, upsert: true });
  if (upErr) {
    if (/bucket not found/i.test(upErr.message)) throw new TableMissingError(DOC_BUCKET);
    throw new Error(upErr.message);
  }

  // Replacing the file at a different path (different filename) would orphan
  // the old object — clean it up after a successful write.
  const previous = await supabaseAdmin
    .from(DOC_TABLE)
    .select('file_path')
    .eq('profile_id', profileId)
    .eq('requirement_id', requirementId)
    .maybeSingle();
  const previousPath = previous.data?.file_path as string | undefined;
  if (previousPath && previousPath !== path) {
    await supabaseAdmin.storage.from(DOC_BUCKET).remove([previousPath]);
  }

  const { data, error } = await supabaseAdmin
    .from(DOC_TABLE)
    .upsert(
      {
        profile_id: profileId,
        requirement_id: requirementId,
        file_path: path,
        file_name: safeName,
        content_type: input.contentType,
        size_bytes: input.bytes.byteLength,
        issued_on: input.issuedOn ?? null,
        expires_on: input.expiresOn ?? null,
        // A fresh upload always needs re-verification.
        status: 'pending',
        verified_by: null,
        verified_at: null,
        review_note: null,
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: 'profile_id,requirement_id' },
    )
    .select(DOC_COLS)
    .single();
  if (error) raise(error, 'sig_employee_documents');
  const row = mapDoc(data);

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: profileId,
    action: AUDIT_DOC_ACTIONS.UPLOADED,
    entityType: 'employee_document',
    entityId: row.id,
    newValue: { requirement: requirement.key, fileName: safeName },
  });
  return row;
}

/** Admin sign-off. `verified` marks the requirement satisfied. */
export async function reviewDocument(
  id: string,
  status: Extract<DocStatus, 'verified' | 'rejected'>,
  actor: Actor,
  opts: { note?: string | null; expiresOn?: string | null } = {},
): Promise<EmployeeDocRow> {
  const existing = await getDocument(id);
  if (!existing) throw new NotFoundError('Document not found.');
  if (status !== 'verified' && status !== 'rejected') {
    throw new ValidationError('Review status must be verified or rejected.');
  }
  if (opts.expiresOn && !DATE_RE.test(opts.expiresOn)) {
    throw new ValidationError('expiresOn must be a YYYY-MM-DD date.');
  }

  const patch: Record<string, unknown> = {
    status,
    verified_by: actor.id,
    verified_at: new Date().toISOString(),
    review_note: opts.note ?? null,
  };
  // Verifiers can correct the expiry they read off the document itself.
  if (opts.expiresOn) patch.expires_on = opts.expiresOn;

  const { data, error } = await supabaseAdmin
    .from(DOC_TABLE)
    .update(patch)
    .eq('id', id)
    .select(DOC_COLS)
    .single();
  if (error) raise(error, 'sig_employee_documents');

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: existing.profileId,
    action: status === 'verified' ? AUDIT_DOC_ACTIONS.VERIFIED : AUDIT_DOC_ACTIONS.REJECTED,
    entityType: 'employee_document',
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status, note: opts.note ?? null },
  });
  return mapDoc(data);
}

export async function deleteDocument(id: string, actor: Actor): Promise<void> {
  const existing = await getDocument(id);
  if (!existing) throw new NotFoundError('Document not found.');

  await supabaseAdmin.storage.from(DOC_BUCKET).remove([existing.filePath]);
  const { error } = await supabaseAdmin.from(DOC_TABLE).delete().eq('id', id);
  if (error) raise(error, 'sig_employee_documents');

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: existing.profileId,
    action: AUDIT_DOC_ACTIONS.DELETED,
    entityType: 'employee_document',
    entityId: id,
    oldValue: { fileName: existing.fileName },
  });
}

/**
 * Mint a short-lived download link. The bucket is private, so this is the only
 * way to read a document — callers MUST authorize before calling.
 */
export async function createDocumentSignedUrl(doc: EmployeeDocRow): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(DOC_BUCKET)
    .createSignedUrl(doc.filePath, SIGNED_URL_TTL_SECONDS);
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new TableMissingError(DOC_BUCKET);
    throw new Error(error.message);
  }
  if (!data?.signedUrl) throw new Error('Could not create a download link.');
  return data.signedUrl;
}

// ─── Compliance roll-up (drives the stat cards) ─────────────

export interface RequirementState {
  requirement: RequirementRow;
  document: EmployeeDocRow | null;
  state: ComplianceState;
  /** Days until expiry; negative when already expired. Null when no expiry. */
  daysToExpiry: number | null;
}

export interface EmployeeCompliance {
  profileId: string;
  name: string;
  email: string;
  role: Role;
  photoUrl: string | null;
  items: RequirementState[];
  requiredCount: number;
  satisfiedCount: number;
  /** 0–100, rounded. 100 = fully up to date. */
  percent: number;
  isComplete: boolean;
  pendingCount: number;
  expiredCount: number;
  expiringCount: number;
  missingCount: number;
}

/** The single source of truth for "is this requirement satisfied?". */
export function evaluate(
  requirement: RequirementRow,
  doc: EmployeeDocRow | null,
): { state: ComplianceState; daysToExpiry: number | null } {
  if (!doc) return { state: 'missing', daysToExpiry: null };
  if (doc.status === 'rejected') return { state: 'rejected', daysToExpiry: null };
  if (doc.status === 'pending') return { state: 'pending', daysToExpiry: null };

  // Verified from here on.
  if (!doc.expiresOn) return { state: 'verified', daysToExpiry: null };

  const days = daysUntil(doc.expiresOn);
  if (days < 0) return { state: 'expired', daysToExpiry: days };
  if (days <= EXPIRING_SOON_DAYS) return { state: 'expiring', daysToExpiry: days };
  return { state: 'verified', daysToExpiry: days };
}

/** Expiring-soon still counts as satisfied — it hasn't lapsed yet. */
const SATISFIED: readonly ComplianceState[] = ['verified', 'expiring'];

export function buildCompliance(
  profile: { id: string; name: string; email: string; role: Role; photoUrl: string | null },
  requirements: RequirementRow[],
  docs: EmployeeDocRow[],
): EmployeeCompliance {
  const applicable = requirementsForRole(requirements, profile.role);
  const byReq = new Map(docs.map((d) => [d.requirementId, d]));

  const items: RequirementState[] = applicable.map((requirement) => {
    const document = byReq.get(requirement.id) ?? null;
    const { state, daysToExpiry } = evaluate(requirement, document);
    return { requirement, document, state, daysToExpiry };
  });

  const satisfiedCount = items.filter((i) => SATISFIED.includes(i.state)).length;
  const requiredCount = items.length;

  return {
    profileId: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    photoUrl: profile.photoUrl,
    items,
    requiredCount,
    satisfiedCount,
    // No requirements at all reads as complete rather than 0%.
    percent: requiredCount === 0 ? 100 : Math.round((satisfiedCount / requiredCount) * 100),
    isComplete: satisfiedCount === requiredCount,
    pendingCount: items.filter((i) => i.state === 'pending').length,
    expiredCount: items.filter((i) => i.state === 'expired').length,
    expiringCount: items.filter((i) => i.state === 'expiring').length,
    missingCount: items.filter((i) => i.state === 'missing').length,
  };
}

export interface ComplianceOverview {
  employees: EmployeeCompliance[];
  totalEmployees: number;
  /** Employees at 100%. */
  compliantCount: number;
  compliantPercent: number;
  /** Mean completion across all employees, 0–100. */
  averagePercent: number;
  pendingReviewCount: number;
  expiredCount: number;
  expiringCount: number;
  missingCount: number;
}

/**
 * Firm-wide compliance for every active internal employee.
 * This is what the admin stat cards render.
 */
export async function getComplianceOverview(): Promise<ComplianceOverview> {
  const requirements = await listRequirements();

  const { data: profileData, error: profileErr } = await supabaseAdmin
    .from('sig_profiles')
    .select('id, first_name, last_name, display_name, email, role, profile_photo_url')
    .eq('is_internal_user', true)
    .in('status', [USER_STATUSES.ACTIVE, USER_STATUSES.PENDING_SETUP])
    .in('role', INTERNAL_ROLES as unknown as string[]);
  if (profileErr) raise(profileErr, 'sig_profiles');

  const docs = await listAllDocuments();
  const byProfile = new Map<string, EmployeeDocRow[]>();
  for (const d of docs) {
    const list = byProfile.get(d.profileId) ?? [];
    list.push(d);
    byProfile.set(d.profileId, list);
  }

  const employees = (profileData ?? []).map((p) => {
    const name =
      (p.display_name as string)?.trim() ||
      `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() ||
      (p.email as string);
    return buildCompliance(
      {
        id: p.id as string,
        name,
        email: p.email as string,
        role: p.role as Role,
        photoUrl: (p.profile_photo_url as string) ?? null,
      },
      requirements,
      byProfile.get(p.id as string) ?? [],
    );
  });

  employees.sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name));

  const totalEmployees = employees.length;
  const compliantCount = employees.filter((e) => e.isComplete).length;
  const sumPercent = employees.reduce((acc, e) => acc + e.percent, 0);

  return {
    employees,
    totalEmployees,
    compliantCount,
    compliantPercent: totalEmployees === 0 ? 0 : Math.round((compliantCount / totalEmployees) * 100),
    averagePercent: totalEmployees === 0 ? 0 : Math.round(sumPercent / totalEmployees),
    pendingReviewCount: employees.reduce((a, e) => a + e.pendingCount, 0),
    expiredCount: employees.reduce((a, e) => a + e.expiredCount, 0),
    expiringCount: employees.reduce((a, e) => a + e.expiringCount, 0),
    missingCount: employees.reduce((a, e) => a + e.missingCount, 0),
  };
}
