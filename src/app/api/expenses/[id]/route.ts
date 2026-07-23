import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { ForbiddenError } from '@/lib/db-errors';
import {
  deleteExpense,
  getExpense,
  setExpenseStatus,
  updateExpense,
  type ExpenseInput,
  type ExpenseStatus,
} from '@/lib/expenses';

const OWN_OR_ALL = [PERMISSIONS.EXPENSES_VIEW_OWN, PERMISSIONS.EXPENSES_VIEW_ALL] as const;

/** GET /api/expenses/[id] */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission(OWN_OR_ALL);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  try {
    const expense = await getExpense(id);
    if (!expense) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });
    if (expense.profileId !== user.id && !hasPermission(user, PERMISSIONS.EXPENSES_VIEW_ALL)) {
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    return NextResponse.json({ expense });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** PUT /api/expenses/[id] — edit the entry's fields. */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission(OWN_OR_ALL);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  let body: ExpenseInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const expense = await updateExpense(id, body, { id: user.id, email: user.email }, {
      canManageAny: hasPermission(user, PERMISSIONS.EXPENSES_APPROVE),
    });
    return NextResponse.json({ expense });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * PATCH /api/expenses/[id] — move the entry through the workflow.
 * Body: { status: 'submitted' | 'approved' | 'rejected' | 'reimbursed', note? }
 *
 * submitted        → the owner (or an approver) submitting for review
 * approved/rejected → needs expenses.approve
 * reimbursed        → needs expenses.reimburse
 * The legal transition graph itself is enforced in setExpenseStatus().
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission(OWN_OR_ALL);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  let body: { status?: ExpenseStatus; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const next = body.status;
  if (!next) return NextResponse.json({ error: 'A target status is required.' }, { status: 400 });

  try {
    const existing = await getExpense(id);
    if (!existing) return NextResponse.json({ error: 'Expense not found.' }, { status: 404 });

    const isOwner = existing.profileId === user.id;

    if (next === 'submitted') {
      const mayApprove = hasPermission(user, PERMISSIONS.EXPENSES_APPROVE);
      if (!isOwner && !mayApprove) throw new ForbiddenError('You can only submit your own expenses.');
      if (isOwner && !hasPermission(user, PERMISSIONS.EXPENSES_SUBMIT) && !mayApprove) {
        throw new ForbiddenError('Missing permission: expenses.submit');
      }
    } else if (next === 'approved' || next === 'rejected') {
      if (!hasPermission(user, PERMISSIONS.EXPENSES_APPROVE)) {
        throw new ForbiddenError('Missing permission: expenses.approve');
      }
      // An approver signing off on their own claim is a control gap; the
      // second pair of eyes is the point of the workflow.
      if (isOwner) throw new ForbiddenError('You cannot review your own expense.');
    } else if (next === 'reimbursed') {
      if (!hasPermission(user, PERMISSIONS.EXPENSES_REIMBURSE)) {
        throw new ForbiddenError('Missing permission: expenses.reimburse');
      }
    } else {
      return NextResponse.json({ error: `Unsupported target status "${next}".` }, { status: 400 });
    }

    const expense = await setExpenseStatus(id, next, { id: user.id, email: user.email }, {
      note: body.note ?? null,
    });
    return NextResponse.json({ expense });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** DELETE /api/expenses/[id] */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission(OWN_OR_ALL);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  try {
    await deleteExpense(id, { id: user.id, email: user.email }, {
      canManageAny: hasPermission(user, PERMISSIONS.EXPENSES_APPROVE),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
