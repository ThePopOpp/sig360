/**
 * Server-side data access for sig_expenses + sig_mileage_rates.
 *
 * Employees log expenses (mileage or a money amount), submit them, and an
 * approver moves them through draft → submitted → approved/rejected →
 * reimbursed. Mileage rows store the cents-per-mile rate that applied on the
 * trip date; the DB derives total_cents from it (generated column), so the
 * money value can never drift from the miles.
 *
 * Category/status values mirror the enums in
 * supabase/migrations/20260716000001_employee_expenses_documents.sql.
 *
 * server-only: touches the service-role Supabase client.
 */
import { supabaseAdmin } from '@/lib/supabase';
import { writeAuditLog } from '@/lib/rbac/audit';
import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
  isUuid,
  raise,
} from '@/lib/db-errors';

const TABLE = 'sig_expenses';
const RATES_TABLE = 'sig_mileage_rates';

const COLS =
  'id, profile_id, category, expense_date, description, notes, miles, rate_cents, ' +
  'from_location, to_location, amount_cents, total_cents, receipt_path, receipt_name, ' +
  'status, submitted_at, reviewed_by, reviewed_at, review_note, reimbursed_at, ' +
  'created_at, updated_at';

export const EXPENSE_CATEGORIES = [
  'mileage',
  'meals',
  'travel',
  'lodging',
  'supplies',
  'other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'rejected',
  'reimbursed',
] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

/** Statuses the owning employee is still allowed to edit or delete. */
const EMPLOYEE_EDITABLE: readonly ExpenseStatus[] = ['draft', 'rejected'];

export const AUDIT_EXPENSE_ACTIONS = {
  CREATED: 'expense.created',
  UPDATED: 'expense.updated',
  DELETED: 'expense.deleted',
  SUBMITTED: 'expense.submitted',
  APPROVED: 'expense.approved',
  REJECTED: 'expense.rejected',
  REIMBURSED: 'expense.reimbursed',
  RATE_CHANGED: 'expense.mileage_rate_changed',
} as const;

export interface ExpenseRow {
  id: string;
  profileId: string;
  category: ExpenseCategory;
  expenseDate: string;
  description: string;
  notes: string | null;
  miles: number | null;
  rateCents: number | null;
  fromLocation: string | null;
  toLocation: string | null;
  amountCents: number | null;
  totalCents: number;
  receiptPath: string | null;
  receiptName: string | null;
  status: ExpenseStatus;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  reimbursedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MileageRateRow {
  id: string;
  rateCents: number;
  effectiveFrom: string;
  note: string | null;
}

export interface Actor {
  id: string;
  email: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapExpense(r: any): ExpenseRow {
  return {
    id: r.id,
    profileId: r.profile_id,
    category: r.category,
    expenseDate: r.expense_date,
    description: r.description,
    notes: r.notes ?? null,
    // numeric(10,2) arrives as a string from postgrest.
    miles: r.miles === null || r.miles === undefined ? null : Number(r.miles),
    rateCents: r.rate_cents ?? null,
    fromLocation: r.from_location ?? null,
    toLocation: r.to_location ?? null,
    amountCents: r.amount_cents ?? null,
    totalCents: r.total_cents ?? 0,
    receiptPath: r.receipt_path ?? null,
    receiptName: r.receipt_name ?? null,
    status: r.status,
    submittedAt: r.submitted_at ?? null,
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    reviewNote: r.review_note ?? null,
    reimbursedAt: r.reimbursed_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapRate(r: any): MileageRateRow {
  return {
    id: r.id,
    rateCents: r.rate_cents,
    effectiveFrom: r.effective_from,
    note: r.note ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ─── Mileage rates ──────────────────────────────────────────

export async function listMileageRates(): Promise<MileageRateRow[]> {
  const { data, error } = await supabaseAdmin
    .from(RATES_TABLE)
    .select('id, rate_cents, effective_from, note')
    .order('effective_from', { ascending: false });
  if (error) raise(error, 'sig_mileage_rates');
  return (data ?? []).map(mapRate);
}

/**
 * The rate in force on `date` — the newest row effective on or before it.
 * Returns null when no rate has been configured for that far back.
 */
export async function getMileageRateFor(date: string): Promise<MileageRateRow | null> {
  const { data, error } = await supabaseAdmin
    .from(RATES_TABLE)
    .select('id, rate_cents, effective_from, note')
    .lte('effective_from', date)
    .order('effective_from', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) raise(error, 'sig_mileage_rates');
  return data ? mapRate(data) : null;
}

export async function createMileageRate(
  input: { rateCents: number; effectiveFrom: string; note?: string | null },
  actor: Actor,
): Promise<MileageRateRow> {
  if (!Number.isInteger(input.rateCents) || input.rateCents <= 0) {
    throw new ValidationError('Rate must be a positive whole number of cents.');
  }
  if (!DATE_RE.test(input.effectiveFrom)) {
    throw new ValidationError('effectiveFrom must be a YYYY-MM-DD date.');
  }

  const { data, error } = await supabaseAdmin
    .from(RATES_TABLE)
    .upsert(
      {
        rate_cents: input.rateCents,
        effective_from: input.effectiveFrom,
        note: input.note ?? null,
      },
      { onConflict: 'effective_from' },
    )
    .select('id, rate_cents, effective_from, note')
    .single();
  if (error) raise(error, 'sig_mileage_rates');

  await writeAuditLog({
    actorUserId: actor.id,
    action: AUDIT_EXPENSE_ACTIONS.RATE_CHANGED,
    entityType: 'mileage_rate',
    entityId: data.id,
    newValue: { rateCents: input.rateCents, effectiveFrom: input.effectiveFrom },
  });
  return mapRate(data);
}

// ─── Expenses ───────────────────────────────────────────────

export interface ExpenseFilter {
  profileId?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  /** Inclusive lower bound on expense_date (YYYY-MM-DD). */
  from?: string;
  /** Inclusive upper bound on expense_date (YYYY-MM-DD). */
  to?: string;
}

export async function listExpenses(filter: ExpenseFilter = {}): Promise<ExpenseRow[]> {
  let q = supabaseAdmin.from(TABLE).select(COLS);

  if (filter.profileId) q = q.eq('profile_id', filter.profileId);
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.category) q = q.eq('category', filter.category);
  if (filter.from) q = q.gte('expense_date', filter.from);
  if (filter.to) q = q.lte('expense_date', filter.to);

  const { data, error } = await q
    .order('expense_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) raise(error, 'sig_expenses');
  return (data ?? []).map(mapExpense);
}

export async function getExpense(id: string): Promise<ExpenseRow | null> {
  if (!isUuid(id)) return null;
  const { data, error } = await supabaseAdmin.from(TABLE).select(COLS).eq('id', id).maybeSingle();
  if (error) raise(error, 'sig_expenses');
  return data ? mapExpense(data) : null;
}

export interface ExpenseInput {
  category: ExpenseCategory;
  expenseDate: string;
  description: string;
  notes?: string | null;
  // mileage
  miles?: number | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  // everything else
  amountCents?: number | null;
}

async function validateShape(input: ExpenseInput): Promise<{
  miles: number | null;
  rateCents: number | null;
  amountCents: number | null;
}> {
  if (!EXPENSE_CATEGORIES.includes(input.category)) {
    throw new ValidationError(`Unknown category "${input.category}".`);
  }
  if (!DATE_RE.test(input.expenseDate ?? '')) {
    throw new ValidationError('expenseDate must be a YYYY-MM-DD date.');
  }
  if (!input.description?.trim()) {
    throw new ValidationError('Description is required.');
  }

  if (input.category === 'mileage') {
    const miles = Number(input.miles);
    if (!Number.isFinite(miles) || miles <= 0) {
      throw new ValidationError('Mileage entries need a positive number of miles.');
    }
    const rate = await getMileageRateFor(input.expenseDate);
    if (!rate) {
      throw new ValidationError(
        `No mileage rate is configured for ${input.expenseDate}. Add one under expense settings.`,
      );
    }
    // Round to 2dp to match numeric(10,2) rather than letting the DB truncate.
    return { miles: Math.round(miles * 100) / 100, rateCents: rate.rateCents, amountCents: null };
  }

  const amount = Number(input.amountCents);
  if (!Number.isInteger(amount) || amount < 0) {
    throw new ValidationError('Amount must be a whole number of cents (0 or more).');
  }
  return { miles: null, rateCents: null, amountCents: amount };
}

export async function createExpense(
  profileId: string,
  input: ExpenseInput,
  actor: Actor,
): Promise<ExpenseRow> {
  if (!isUuid(profileId)) throw new ValidationError('A valid profile id is required.');
  const shape = await validateShape(input);

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .insert({
      profile_id: profileId,
      category: input.category,
      expense_date: input.expenseDate,
      description: input.description.trim(),
      notes: input.notes ?? null,
      miles: shape.miles,
      rate_cents: shape.rateCents,
      from_location: input.fromLocation ?? null,
      to_location: input.toLocation ?? null,
      amount_cents: shape.amountCents,
      status: 'draft',
    })
    .select(COLS)
    .single();
  if (error) raise(error, 'sig_expenses');
  const row = mapExpense(data);

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: profileId,
    action: AUDIT_EXPENSE_ACTIONS.CREATED,
    entityType: 'expense',
    entityId: row.id,
    newValue: { category: row.category, totalCents: row.totalCents },
  });
  return row;
}

/**
 * Edit an entry. `canManageAny` callers (approvers) may edit regardless of
 * status; the owning employee may only touch draft/rejected rows.
 */
export async function updateExpense(
  id: string,
  input: ExpenseInput,
  actor: Actor,
  opts: { canManageAny: boolean },
): Promise<ExpenseRow> {
  const existing = await getExpense(id);
  if (!existing) throw new NotFoundError('Expense not found.');

  if (!opts.canManageAny) {
    if (existing.profileId !== actor.id) {
      throw new ForbiddenError('You can only edit your own expenses.');
    }
    if (!EMPLOYEE_EDITABLE.includes(existing.status)) {
      throw new ForbiddenError(`A ${existing.status} expense can no longer be edited.`);
    }
  }

  const shape = await validateShape(input);

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update({
      category: input.category,
      expense_date: input.expenseDate,
      description: input.description.trim(),
      notes: input.notes ?? null,
      miles: shape.miles,
      rate_cents: shape.rateCents,
      from_location: input.fromLocation ?? null,
      to_location: input.toLocation ?? null,
      amount_cents: shape.amountCents,
    })
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) raise(error, 'sig_expenses');
  const row = mapExpense(data);

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: existing.profileId,
    action: AUDIT_EXPENSE_ACTIONS.UPDATED,
    entityType: 'expense',
    entityId: id,
    oldValue: { totalCents: existing.totalCents },
    newValue: { totalCents: row.totalCents },
  });
  return row;
}

export async function deleteExpense(
  id: string,
  actor: Actor,
  opts: { canManageAny: boolean },
): Promise<void> {
  const existing = await getExpense(id);
  if (!existing) throw new NotFoundError('Expense not found.');

  if (!opts.canManageAny) {
    if (existing.profileId !== actor.id) {
      throw new ForbiddenError('You can only delete your own expenses.');
    }
    if (!EMPLOYEE_EDITABLE.includes(existing.status)) {
      throw new ForbiddenError(`A ${existing.status} expense can no longer be deleted.`);
    }
  }

  const { error } = await supabaseAdmin.from(TABLE).delete().eq('id', id);
  if (error) raise(error, 'sig_expenses');

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: existing.profileId,
    action: AUDIT_EXPENSE_ACTIONS.DELETED,
    entityType: 'expense',
    entityId: id,
    oldValue: { category: existing.category, totalCents: existing.totalCents },
  });
}

/** Legal status transitions. Anything not listed here is rejected. */
const TRANSITIONS: Record<ExpenseStatus, readonly ExpenseStatus[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'rejected'],
  rejected: ['submitted'],
  approved: ['reimbursed', 'rejected'],
  reimbursed: [],
};

export async function setExpenseStatus(
  id: string,
  next: ExpenseStatus,
  actor: Actor,
  opts: { note?: string | null } = {},
): Promise<ExpenseRow> {
  const existing = await getExpense(id);
  if (!existing) throw new NotFoundError('Expense not found.');

  if (!TRANSITIONS[existing.status].includes(next)) {
    throw new ValidationError(`Cannot move an expense from ${existing.status} to ${next}.`);
  }

  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status: next };

  if (next === 'submitted') {
    patch.submitted_at = now;
    // Re-submitting after a rejection clears the previous review.
    patch.reviewed_by = null;
    patch.reviewed_at = null;
    patch.review_note = null;
  } else if (next === 'approved' || next === 'rejected') {
    patch.reviewed_by = actor.id;
    patch.reviewed_at = now;
    patch.review_note = opts.note ?? null;
  } else if (next === 'reimbursed') {
    patch.reimbursed_at = now;
  }

  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .update(patch)
    .eq('id', id)
    .select(COLS)
    .single();
  if (error) raise(error, 'sig_expenses');
  const row = mapExpense(data);

  const action = {
    submitted: AUDIT_EXPENSE_ACTIONS.SUBMITTED,
    approved: AUDIT_EXPENSE_ACTIONS.APPROVED,
    rejected: AUDIT_EXPENSE_ACTIONS.REJECTED,
    reimbursed: AUDIT_EXPENSE_ACTIONS.REIMBURSED,
    draft: AUDIT_EXPENSE_ACTIONS.UPDATED,
  }[next];

  await writeAuditLog({
    actorUserId: actor.id,
    targetUserId: existing.profileId,
    action,
    entityType: 'expense',
    entityId: id,
    oldValue: { status: existing.status },
    newValue: { status: next, note: opts.note ?? null, totalCents: row.totalCents },
  });
  return row;
}

export interface ExpenseSummary {
  count: number;
  totalCents: number;
  byStatus: Record<ExpenseStatus, { count: number; totalCents: number }>;
  mileageMiles: number;
}

/** Roll up a set of rows for the stat cards. */
export function summarizeExpenses(rows: ExpenseRow[]): ExpenseSummary {
  const byStatus = Object.fromEntries(
    EXPENSE_STATUSES.map((s) => [s, { count: 0, totalCents: 0 }]),
  ) as ExpenseSummary['byStatus'];

  let totalCents = 0;
  let mileageMiles = 0;

  for (const r of rows) {
    totalCents += r.totalCents;
    byStatus[r.status].count += 1;
    byStatus[r.status].totalCents += r.totalCents;
    if (r.category === 'mileage') mileageMiles += r.miles ?? 0;
  }

  return {
    count: rows.length,
    totalCents,
    byStatus,
    mileageMiles: Math.round(mileageMiles * 100) / 100,
  };
}
