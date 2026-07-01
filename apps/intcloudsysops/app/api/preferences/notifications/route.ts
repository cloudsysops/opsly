import { type NextRequest, NextResponse } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { supabaseServer } from '@/lib/supabase';

const TENANT_SLUG = 'peskids';

const VALID_EVENTS = new Set([
  'submission_reviewed',
  'submission_observation',
  'submission_reassigned',
  'followup_due',
  'weekly_report',
]);

const DEFAULT_EVENTS = [
  'submission_reviewed',
  'submission_observation',
  'submission_reassigned',
  'followup_due',
  'weekly_report',
];

/** GET /api/preferences/notifications — fetch or create default preferences */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);

  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const userId = auth.user.id;

  try {
    const client = supabaseServer();

    const { data, error } = await client
      .schema('peskids')
      .from('notification_preferences')
      .select('id, email_enabled, whatsapp_enabled, inapp_enabled, events, created_at, updated_at')
      .eq('user_id', userId)
      .eq('tenant_slug', TENANT_SLUG)
      .maybeSingle();

    if (error) {
      console.error('[GET /api/preferences/notifications] Supabase error', error, {
        request_id: requestId,
      });
      return errorJson(requestId, 'Failed to fetch notification preferences', 500);
    }

    if (data) {
      return successJson(requestId, { preferences: data });
    }

    // No row yet — upsert defaults and return them
    const { data: created, error: insertError } = await client
      .schema('peskids')
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          tenant_slug: TENANT_SLUG,
          email_enabled: true,
          whatsapp_enabled: false,
          inapp_enabled: true,
          events: DEFAULT_EVENTS,
        },
        { onConflict: 'user_id,tenant_slug' }
      )
      .select('id, email_enabled, whatsapp_enabled, inapp_enabled, events, created_at, updated_at')
      .single();

    if (insertError) {
      console.error('[GET /api/preferences/notifications] upsert error', insertError, {
        request_id: requestId,
      });
      return errorJson(requestId, 'Failed to initialize notification preferences', 500);
    }

    return successJson(requestId, { preferences: created });
  } catch (err) {
    console.error('[GET /api/preferences/notifications] exception', err, {
      request_id: requestId,
    });
    return errorJson(requestId, 'Failed to fetch notification preferences', 500);
  }
}

/** PUT /api/preferences/notifications — upsert user preferences */
export async function PUT(req: NextRequest): Promise<NextResponse> {
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

  if (typeof body !== 'object' || body === null) {
    return errorJson(requestId, 'Request body must be a JSON object', 400);
  }

  const raw = body as Record<string, unknown>;

  // Validate optional boolean fields
  for (const field of ['email_enabled', 'whatsapp_enabled', 'inapp_enabled'] as const) {
    if (field in raw && typeof raw[field] !== 'boolean') {
      return errorJson(requestId, `${field} must be a boolean`, 400);
    }
  }

  // Validate optional events array
  if ('events' in raw) {
    if (!Array.isArray(raw.events)) {
      return errorJson(requestId, 'events must be an array of strings', 400);
    }
    const invalidEvent = (raw.events as unknown[]).find(
      (e) => typeof e !== 'string' || !VALID_EVENTS.has(e)
    );
    if (invalidEvent !== undefined) {
      return errorJson(
        requestId,
        `Invalid event type: ${String(invalidEvent)}. Valid: ${[...VALID_EVENTS].join(', ')}`,
        400
      );
    }
  }

  const patch: {
    user_id: string;
    tenant_slug: string;
    updated_at: string;
    email_enabled?: boolean;
    whatsapp_enabled?: boolean;
    inapp_enabled?: boolean;
    events?: string[];
  } = {
    user_id: userId,
    tenant_slug: TENANT_SLUG,
    updated_at: new Date().toISOString(),
  };

  if (typeof raw.email_enabled === 'boolean') patch.email_enabled = raw.email_enabled;
  if (typeof raw.whatsapp_enabled === 'boolean') patch.whatsapp_enabled = raw.whatsapp_enabled;
  if (typeof raw.inapp_enabled === 'boolean') patch.inapp_enabled = raw.inapp_enabled;
  if (Array.isArray(raw.events)) patch.events = raw.events as string[];

  try {
    const client = supabaseServer();

    const { data, error } = await client
      .schema('peskids')
      .from('notification_preferences')
      .upsert(patch, { onConflict: 'user_id,tenant_slug' })
      .select('id, email_enabled, whatsapp_enabled, inapp_enabled, events, created_at, updated_at')
      .single();

    if (error) {
      console.error('[PUT /api/preferences/notifications] Supabase error', error, {
        request_id: requestId,
      });
      return errorJson(requestId, 'Failed to update notification preferences', 500);
    }

    return successJson(requestId, { preferences: data });
  } catch (err) {
    console.error('[PUT /api/preferences/notifications] exception', err, {
      request_id: requestId,
    });
    return errorJson(requestId, 'Failed to update notification preferences', 500);
  }
}
