import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission, guardPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { createMileageRate, getMileageRateFor, listMileageRates } from '@/lib/expenses';

/**
 * GET /api/expenses/rates — the mileage rate history, plus the rate that
 * applies today so the entry form can prefill and preview a reimbursement.
 */
export async function GET() {
  const gate = await guardAnyPermission([PERMISSIONS.EXPENSES_VIEW_OWN, PERMISSIONS.EXPENSES_VIEW_ALL]);
  if (gate.response) return gate.response;

  try {
    const [rates, current] = await Promise.all([
      listMileageRates(),
      getMileageRateFor(new Date().toISOString().slice(0, 10)),
    ]);
    return NextResponse.json({ rates, current });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/expenses/rates — set the rate effective from a date.
 * Re-posting the same effective_from updates that rate rather than erroring.
 */
export async function POST(req: NextRequest) {
  const gate = await guardPermission(PERMISSIONS.EXPENSES_MANAGE_RATES);
  if (gate.response) return gate.response;
  const { user } = gate;

  let body: { rateCents?: number; effectiveFrom?: string; note?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.rateCents === undefined || !body.effectiveFrom) {
    return NextResponse.json(
      { error: 'rateCents and effectiveFrom are required.' },
      { status: 400 },
    );
  }

  try {
    const rate = await createMileageRate(
      { rateCents: body.rateCents, effectiveFrom: body.effectiveFrom, note: body.note ?? null },
      { id: user.id, email: user.email },
    );
    return NextResponse.json({ rate }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
