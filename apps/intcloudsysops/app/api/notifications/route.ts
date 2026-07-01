import { type NextRequest, NextResponse } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { supabaseServer } from '@/lib/supabase';

const TENANT_SLUG = 'peskids';
const NOTIFICATION_LIMIT = 50;

/** GET /api/notifications — last 50 in-app notifications + unread count */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);

  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const userId = auth.user.id;

  try {
    const client = supabaseServer();

    const { data: notifications, error } = await client
      .schema('peskids')
      .from('notifications')
      .select('id, type, title, body, metadata, read_at, created_at')
      .eq('user_id', userId)
      .eq('tenant_slug', TENANT_SLUG)
      .order('created_at', { ascending: false })
      .limit(NOTIFICATION_LIMIT);

    if (error) {
      console.error('[GET /api/notifications] Supabase error', error, { request_id: requestId });
      return errorJson(requestId, 'Failed to fetch notifications', 500);
    }

    const items = notifications ?? [];
    const unreadCount = items.filter((n) => n.read_at === null).length;

    return successJson(requestId, {
      notifications: items,
      unread_count: unreadCount,
    });
  } catch (err) {
    console.error('[GET /api/notifications] exception', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to fetch notifications', 500);
  }
}

/** PATCH /api/notifications — mark given IDs as read */
export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);

  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const userId = auth.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !Array.isArray((body as Record<string, unknown>).ids) ||
    (body as Record<string, unknown>).read !== true
  ) {
    return errorJson(requestId, 'Body must be { ids: string[], read: true }', 400);
  }

  const ids = ((body as Record<string, unknown>).ids as unknown[]).filter(
    (id): id is string => typeof id === 'string'
  );

  if (ids.length === 0) {
    return errorJson(requestId, 'ids array must not be empty', 400);
  }

  try {
    const client = supabaseServer();

    const { error } = await client
      .schema('peskids')
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', userId)
      .eq('tenant_slug', TENANT_SLUG)
      .is('read_at', null);

    if (error) {
      console.error('[PATCH /api/notifications] Supabase error', error, { request_id: requestId });
      return errorJson(requestId, 'Failed to mark notifications as read', 500);
    }

    return successJson(requestId, { updated: ids.length });
  } catch (err) {
    console.error('[PATCH /api/notifications] exception', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to mark notifications as read', 500);
  }
}
