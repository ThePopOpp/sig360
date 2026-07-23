import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { getProfile } from '@/lib/rbac/profiles';
import {
  buildCompliance,
  listDocumentsForProfile,
  listRequirements,
} from '@/lib/employee-documents';

/**
 * GET /api/employee-documents — one employee's document portal:
 * every requirement that applies to them, the file they've uploaded (if any),
 * and the derived state of each.
 *
 * Defaults to the caller. ?profileId= is honoured only for callers holding
 * employee_docs.view_all.
 */
export async function GET(req: NextRequest) {
  const gate = await guardAnyPermission([
    PERMISSIONS.EMPLOYEE_DOCS_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL,
  ]);
  if (gate.response) return gate.response;
  const { user } = gate;

  const { searchParams } = new URL(req.url);
  const requested = searchParams.get('profileId');
  const canViewAll = hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL);

  if (requested && requested !== user.id && !canViewAll) {
    return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
  }
  const profileId = requested && canViewAll ? requested : user.id;

  try {
    const [requirements, docs, profile] = await Promise.all([
      listRequirements(),
      listDocumentsForProfile(profileId),
      getProfile(profileId),
    ]);

    if (!profile) {
      return NextResponse.json(
        {
          error:
            'No employee profile found for this account. Ask an admin to provision your profile.',
        },
        { status: 404 },
      );
    }

    const name =
      profile.displayName?.trim() ||
      `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim() ||
      profile.email;

    const compliance = buildCompliance(
      {
        id: profile.id,
        name,
        email: profile.email,
        role: profile.role,
        photoUrl: profile.profilePhotoUrl ?? null,
      },
      requirements,
      docs,
    );

    return NextResponse.json({
      compliance,
      canVerify: hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_VERIFY),
      canViewAll,
      isSelf: profileId === user.id,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
