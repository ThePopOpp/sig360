import { NextResponse } from 'next/server';
import { guardPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { getComplianceOverview } from '@/lib/employee-documents';

/**
 * GET /api/employee-documents/overview — firm-wide compliance.
 *
 * Powers the admin stat cards: how many employees are 100% up to date, the
 * average completion of everyone else, and what's waiting on a verifier.
 */
export async function GET() {
  const gate = await guardPermission(PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL);
  if (gate.response) return gate.response;
  const { user } = gate;

  try {
    const overview = await getComplianceOverview();
    return NextResponse.json({
      ...overview,
      canVerify: hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_VERIFY),
      canManageRequirements: hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_MANAGE_REQUIREMENTS),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
