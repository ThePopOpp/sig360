import { NextRequest, NextResponse } from 'next/server';
import { guardPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { updateRequirement, type RequirementInput } from '@/lib/employee-documents';

/**
 * PATCH /api/employee-documents/requirements/[id] — edit a requirement.
 *
 * Set isActive:false to retire one. Deactivating is preferred over deleting:
 * documents already uploaded against it stay linked and auditable.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardPermission(PERMISSIONS.EMPLOYEE_DOCS_MANAGE_REQUIREMENTS);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  let body: Partial<RequirementInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const requirement = await updateRequirement(id, body, { id: user.id, email: user.email });
    return NextResponse.json({ requirement });
  } catch (err) {
    return toErrorResponse(err);
  }
}
