import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const email = auth.user.email?.trim().toLowerCase();

  try {
    let query = supabaseServer()
      .from('students')
      .select('id, name, grade, status')
      .eq('tenant_id', tenantSlug())
      .eq('status', 'active');

    if (email) {
      query = query.or(`family_user_id.eq.${auth.user.id},parent_email.ilike.${email}`);
    } else {
      query = query.eq('family_user_id', auth.user.id);
    }

    const { data, error } = await query.order('name');
    if (error?.message?.includes('family_user_id')) {
      const fallback = await supabaseServer()
        .from('students')
        .select('id, name, grade, status')
        .eq('tenant_id', tenantSlug())
        .eq('status', 'active')
        .ilike('parent_email', email ?? '')
        .order('name');
      if (fallback.error) throw fallback.error;
      return successJson(requestId, { ok: true, students: fallback.data ?? [] });
    }
    if (error) throw error;

    return successJson(requestId, { ok: true, students: data ?? [] });
  } catch (err) {
    console.error('[GET /api/portal/students]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list students', 500);
  }
}
