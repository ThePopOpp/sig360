import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission, guardPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { createRequirement, listRequirements, type RequirementInput } from '@/lib/employee-documents';

/**
 * GET /api/employee-documents/requirements — the requirement catalog.
 * ?includeInactive=true (admins only) also returns retired requirements.
 */
export async function GET(req: NextRequest) {
  const gate = await guardAnyPermission([
    PERMISSIONS.EMPLOYEE_DOCS_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL,
  ]);
  if (gate.response) return gate.response;
  const { user } = gate;

  const { searchParams } = new URL(req.url);
  const canManage = hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_MANAGE_REQUIREMENTS);
  const includeInactive = searchParams.get('includeInactive') === 'true' && canManage;

  try {
    const requirements = await listRequirements({ includeInactive });
    return NextResponse.json({ requirements, canManage });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/** POST /api/employee-documents/requirements — add a required document type. */
export async function POST(req: NextRequest) {
  const gate = await guardPermission(PERMISSIONS.EMPLOYEE_DOCS_MANAGE_REQUIREMENTS);
  if (gate.response) return gate.response;
  const { user } = gate;

  let body: RequirementInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const requirement = await createRequirement(body, { id: user.id, email: user.email });
    return NextResponse.json({ requirement }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
