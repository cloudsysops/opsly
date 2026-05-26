import { NextRequest } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { supabaseServer } from '@/lib/supabase';
import { isMissingExpandedFeedbackColumn } from '@/lib/utils/db-compat';
import type { Database } from '@/lib/types';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
  const parentEmail = auth.user.email?.trim() ?? '';
  const supabase = supabaseServer();

  if (!parentEmail) {
    return errorJson(requestId, 'Family email not found in session', 400);
  }

  const recentFeedbackQuery = async () =>
    supabase
      .from('feedback')
      .select(
        'id, child_name, satisfaction, suggestion, author_type, subject_type, visibility, audience, parent_email, body, rating, status, created_at'
      )
      .eq('tenant_id', tenantId)
      .eq('parent_email', parentEmail)
      .order('created_at', { ascending: false })
      .limit(12);

  let error: { message?: string } | null = null;
  const feedbackResult = await recentFeedbackQuery();
  let feedback = (feedbackResult.data ?? []) as Database['public']['Tables']['feedback']['Row'][];
  error = feedbackResult.error;

  if (error && isMissingExpandedFeedbackColumn(error)) {
    const fallback = await supabase
      .from('feedback')
      .select('id, child_name, satisfaction, suggestion, parent_email')
      .eq('tenant_id', tenantId)
      .eq('parent_email', parentEmail)
      .order('created_at', { ascending: false })
      .limit(12);
    feedback = (fallback.data ?? []) as Database['public']['Tables']['feedback']['Row'][];
    error = fallback.error;
  }

  if (error) {
    return errorJson(requestId, 'Failed to fetch family feedback', 500);
  }

  return successJson(requestId, {
    feedback,
    count: feedback.length,
    parentEmail,
  });
}
