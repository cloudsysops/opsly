import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { supabaseServer } from '@/lib/supabase';

interface PeskidsLead {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  grade_interested: string;
  class_modality: string | null;
  [key: string]: unknown;
}

// Leads live in the shared api app's 'platform' schema (platform.peskids_leads),
// not in this app's own 'public' schema — same escape hatch as
// lib/services/lead-admin.service.ts's platformFrom(), since that schema's
// tables aren't in this app's generated Database types.
function platformLeadsFrom() {
  const client = supabaseServer() as unknown as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = resolveRequestId(request);

  try {
    const { id } = await params;
    const leadId = id?.trim();
    if (!leadId) {
      return errorJson(requestId, 'Lead ID is required', 400);
    }

    const { data, error } = await platformLeadsFrom()
      .select('*')
      .eq('id', leadId)
      .eq('tenant_slug', 'peskids')
      .single();

    if (error || !data) {
      return errorJson(requestId, 'Lead not found', 404);
    }

    const lead = data as PeskidsLead;

    return successJson(requestId, {
      ok: true,
      data: {
        id: lead.id,
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        grade_interested: lead.grade_interested,
        class_modality: lead.class_modality,
      },
    });
  } catch (error) {
    console.error('Peskids get lead error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
