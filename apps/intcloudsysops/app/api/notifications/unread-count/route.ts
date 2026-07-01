import { type NextRequest, NextResponse } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { supabaseServer } from '@/lib/supabase';

const TENANT_SLUG = 'peskids';

/** GET /api/notifications/unread-count — fast unread badge count */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);

  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const userId = auth.user.id;

  try {
    const client = supabaseServer();

    const { count, error } = await client
      .schema('peskids')
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tenant_slug', TENANT_SLUG)
      .is('read_at', null);

    if (error) {
      console.error('[GET /api/notifications/unread-count] Supabase error', error, {
        request_id: requestId,
      });
      return errorJson(requestId, 'Failed to fetch unread count', 500);
    }

    return successJson(requestId, { count: count ?? 0 });
  } catch (err) {
    console.error('[GET /api/notifications/unread-count] exception', err, {
      request_id: requestId,
    });
    return errorJson(requestId, 'Failed to fetch unread count', 500);
  }
}
