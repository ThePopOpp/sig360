import { NextRequest, NextResponse } from 'next/server';
import { guardAnyPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse } from '@/lib/api-errors';
import { deleteDocument, getDocument, reviewDocument, type DocStatus } from '@/lib/employee-documents';

const OWN_OR_ALL = [
  PERMISSIONS.EMPLOYEE_DOCS_VIEW_OWN,
  PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL,
] as const;

/**
 * PATCH /api/employee-documents/[id] — verify or reject an upload.
 * Body: { status: 'verified' | 'rejected', note?, expiresOn? }
 *
 * Requires employee_docs.verify. Nobody signs off on their own document.
 */
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission([PERMISSIONS.EMPLOYEE_DOCS_VERIFY]);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  let body: { status?: DocStatus; note?: string | null; expiresOn?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  if (body.status !== 'verified' && body.status !== 'rejected') {
    return NextResponse.json(
      { error: 'status must be "verified" or "rejected".' },
      { status: 400 },
    );
  }

  try {
    const existing = await getDocument(id);
    if (!existing) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    if (existing.profileId === user.id) {
      return NextResponse.json(
        { error: 'You cannot verify your own document.' },
        { status: 403 },
      );
    }

    const document = await reviewDocument(id, body.status, { id: user.id, email: user.email }, {
      note: body.note ?? null,
      expiresOn: body.expiresOn ?? null,
    });
    return NextResponse.json({ document });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * DELETE /api/employee-documents/[id] — remove an upload and its stored file.
 * Employees may remove their own; employee_docs.verify holders may remove any.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await guardAnyPermission(OWN_OR_ALL);
  if (gate.response) return gate.response;
  const { user } = gate;
  const { id } = await ctx.params;

  try {
    const existing = await getDocument(id);
    if (!existing) return NextResponse.json({ error: 'Document not found.' }, { status: 404 });

    const isOwner = existing.profileId === user.id;
    if (!isOwner && !hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_VERIFY)) {
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }

    await deleteDocument(id, { id: user.id, email: user.email });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return toErrorResponse(err);
  }
}
