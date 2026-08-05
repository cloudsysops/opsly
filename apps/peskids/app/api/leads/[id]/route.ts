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

    const supabase = supabaseServer();
    const { data, error } = await supabase
      .from('peskids_leads')
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
        full_name: lead.full_name || String(lead.name ?? ''),
        email: lead.email,
        phone: lead.phone,
        grade_interested: lead.grade_interested,
        class_modality: lead.class_modality,
        child_name: typeof lead.child_name === 'string' ? lead.child_name : null,
        neighborhood: typeof lead.neighborhood === 'string' ? lead.neighborhood : null,
        lead_type: typeof lead.lead_type === 'string' ? lead.lead_type : null,
      },
    });
  } catch (error) {
    console.error('Peskids get lead error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
