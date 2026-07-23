import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission, guardPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse, requireRealProfile } from '@/lib/api-errors';
import {
  createExpense,
  listExpenses,
  summarizeExpenses,
  type ExpenseCategory,
  type ExpenseFilter,
  type ExpenseInput,
  type ExpenseStatus,
} from '@/lib/expenses';

/**
 * GET /api/expenses — list expenses.
 *
 * Scope: callers with expenses.view_all may pass ?profileId= or ?scope=all to
 * see other people's entries. Everyone else is silently pinned to their own,
 * regardless of what they ask for.
 */
export async function GET(req: NextRequest) {
  const gate = await guardAnyPermission([PERMISSIONS.EXPENSES_VIEW_OWN, PERMISSIONS.EXPENSES_VIEW_ALL]);
  if (gate.response) return gate.response;
  const { user } = gate;

  const { searchParams } = new URL(req.url);
  const canViewAll = hasPermission(user, PERMISSIONS.EXPENSES_VIEW_ALL);
  const wantsAll = searchParams.get('scope') === 'all';
  const requestedProfile = searchParams.get('profileId');

  const filter: ExpenseFilter = {};
  if (canViewAll && (wantsAll || requestedProfile)) {
    if (requestedProfile) filter.profileId = requestedProfile;
  } else {
    filter.profileId = user.id;
  }

  const status = searchParams.get('status');
  const category = searchParams.get('category');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (status) filter.status = status as ExpenseStatus;
  if (category) filter.category = category as ExpenseCategory;
  if (from) filter.from = from;
  if (to) filter.to = to;

  try {
    const expenses = await listExpenses(filter);
    return NextResponse.json({
      expenses,
      summary: summarizeExpenses(expenses),
      canViewAll,
      canApprove: hasPermission(user, PERMISSIONS.EXPENSES_APPROVE),
      canReimburse: hasPermission(user, PERMISSIONS.EXPENSES_REIMBURSE),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** POST /api/expenses — log a new expense against the caller's own profile. */
export async function POST(req: NextRequest) {
  const gate = await guardPermission(PERMISSIONS.EXPENSES_CREATE);
  if (gate.response) return gate.response;
  const { user } = gate;

  const legacy = requireRealProfile(user.id);
  if (legacy) return legacy;

  let body: ExpenseInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const expense = await createExpense(user.id, body, { id: user.id, email: user.email });
    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
