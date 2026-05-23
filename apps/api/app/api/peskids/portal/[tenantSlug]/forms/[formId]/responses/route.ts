import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; formId: string }> }
): Promise<Response> {
  try {
    const { tenantSlug, formId } = await params;

    if (!tenantSlug || !formId) {
      return jsonError('Missing tenant slug or form ID', HTTP_STATUS.BAD_REQUEST);
    }

    const supabase = getSupabaseClient();

    // Verify form exists and belongs to tenant
    const { data: form, error: formError } = await supabase
      .from('peskids.forms')
      .select('id')
      .eq('form_id', formId)
      .eq('tenant_slug', tenantSlug)
      .single();

    if (formError || !form) {
      return jsonError('Form not found', HTTP_STATUS.NOT_FOUND);
    }

    // Get form submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('peskids.form_submissions')
      .select('submission_id, submission_data, completed_at')
      .eq('form_id', formId)
      .eq('tenant_slug', tenantSlug)
      .order('completed_at', { ascending: false });

    if (submissionsError) {
      console.error('Failed to fetch submissions:', submissionsError);
      return jsonError('Failed to fetch responses', HTTP_STATUS.INTERNAL_ERROR);
    }

    const responses = (submissions || []).map((sub) => ({
      submissionId: sub.submission_id,
      completedAt: sub.completed_at,
      data: sub.submission_data,
    }));

    return jsonOk({
      formId,
      responses,
      count: responses.length,
    });
  } catch (error) {
    console.error('Form responses error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
