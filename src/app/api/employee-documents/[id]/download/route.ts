import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { createDocumentSignedUrl, getDocument } from '@/lib/employee-documents';

/**
 * GET /api/employee-documents/[id]/download — redirect to a short-lived
 * signed URL for the file.
 *
 * The bucket is private, so this route IS the access check: the owner, or
 * someone holding employee_docs.view_all. Nothing else may mint a link.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission([
    PERMISSIONS.EMPLOYEE_DOCS_VIEW_OWN,
    PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL,
  ]);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  try {
    const doc = await getDocument(id);
    if (!doc) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

    const isOwner = doc.profileId === user.id;
    if (!isOwner && !hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL)) {
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }

    const url = await createDocumentSignedUrl(doc);
    return NextResponse.redirect(url);
  } catch (err) {
    return toErrorResponse(err);
  }
}
