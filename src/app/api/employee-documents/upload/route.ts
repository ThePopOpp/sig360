import { NextRequest, NextResponse } from 'next/server';
import { guardPermission } from '@/lib/rbac/route-guards';
import { PERMISSIONS, hasPermission } from '@/lib/rbac';
import { toErrorResponse, requireRealProfile } from '@/lib/api-errors';
import { uploadEmployeeDocument } from '@/lib/employee-documents';

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB — scans of multi-page agreements.
const ALLOWED = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
]);

/**
 * POST /api/employee-documents/upload — multipart upload of one document.
 *
 * Fields: file, requirementId, issuedOn?, expiresOn?, profileId?
 * Employees upload for themselves; profileId is honoured only for callers
 * holding employee_docs.view_all (an admin filing on someone's behalf).
 */
export async function POST(req: NextRequest) {
  const gate = await guardPermission(PERMISSIONS.EMPLOYEE_DOCS_UPLOAD_OWN);
  if (gate.response) return gate.response;
  const { user } = gate;

  const legacy = requireRealProfile(user.id);
  if (legacy) return legacy;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing "file".' }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: 'Unsupported file type. Upload a PDF or an image (PNG, JPEG, WEBP, HEIC).' },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large (max 15 MB).' }, { status: 400 });
  }

  const requirementId = form.get('requirementId');
  if (typeof requirementId !== 'string' || !requirementId) {
    return NextResponse.json({ error: 'Missing "requirementId".' }, { status: 400 });
  }

  const requestedProfile = form.get('profileId');
  let profileId = user.id;
  if (typeof requestedProfile === 'string' && requestedProfile && requestedProfile !== user.id) {
    if (!hasPermission(user, PERMISSIONS.EMPLOYEE_DOCS_VIEW_ALL)) {
      return NextResponse.json(
        { error: 'You can only upload documents for yourself.' },
        { status: 403 },
      );
    }
    profileId = requestedProfile;
  }

  const issuedOn = form.get('issuedOn');
  const expiresOn = form.get('expiresOn');

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await uploadEmployeeDocument(
      profileId,
      requirementId,
      {
        bytes,
        fileName: file.name,
        contentType: file.type,
        issuedOn: typeof issuedOn === 'string' && issuedOn ? issuedOn : null,
        expiresOn: typeof expiresOn === 'string' && expiresOn ? expiresOn : null,
      },
      { id: user.id, email: user.email },
    );
    return NextResponse.json({ document }, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
