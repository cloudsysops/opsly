import { type NextRequest, NextResponse } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { getActiveFamilyForm } from '@/lib/services/family-form.service';

interface RouteContext {
  params: Promise<{ formId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const { formId } = await context.params;
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const form = await getActiveFamilyForm(tenantSlug, formId);
    if (!form) {
      return errorJson(requestId, 'Form not found', 404);
    }

    return successJson(requestId, { form });
  } catch (error) {
    console.error('Form detail error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to load form', 500);
  }
}
