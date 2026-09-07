import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { getLeadForAdmin } from '@/lib/services/lead-admin.service';
import { issueEnrollmentLink } from '@/lib/enrollment-access/issue';
import { supabaseEnrollmentLeadStore } from '@/lib/enrollment-access/store';
import { emitEvent } from '@/lib/events';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }
  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { id } = await context.params;
  const slug = tenantSlug();
  const lead = await getLeadForAdmin(id, slug);
  if (!lead) {
    return errorJson(requestId, 'Not found', 404);
  }

  const issued = await issueEnrollmentLink({
    store: supabaseEnrollmentLeadStore,
    leadId: id,
    tenantSlug: slug,
    leadName: lead.name,
    requestId,
  });
  if (!issued) {
    return errorJson(requestId, 'Not found', 404);
  }

  void emitEvent('enrollment.link.prepared', { lead_id: id }).catch(() => undefined);
  void emitEvent('whatsapp.draft.created', { lead_id: id, template: 'ENROLLMENT_LINK' }).catch(
    () => undefined
  );

  return successJson(requestId, {
    ok: true,
    execute_external: false,
    enrollment_url: issued.url,
    expires_at: issued.expires_at,
    whatsapp_draft: issued.whatsapp_draft,
    next_action: 'SEND_ENROLLMENT_LINK',
  });
}
