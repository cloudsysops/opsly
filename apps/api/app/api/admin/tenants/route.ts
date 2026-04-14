import { tryRoute } from '../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../lib/constants';
import { resolveSuperAdminSession } from '../../../../lib/super-admin-auth';
import { getServiceClient } from '../../../../lib/supabase';
import type { Json } from '../../../../lib/supabase/types';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function parseNonNegInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampLimit(limit: number): number {
  return Math.min(limit, MAX_LIMIT);
}

interface TenantsPagePayload {
  total: number;
  items: unknown[];
}

function asTenantsPage(raw: Json): TenantsPagePayload | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const total = o.total;
  const items = o.items;
  if (typeof total !== 'number' || !Array.isArray(items)) {
    return null;
  }
  return { total, items };
}

export async function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/admin/tenants', async () => {
    const auth = await resolveSuperAdminSession(request);
    if (!auth.ok) {
      return auth.response;
    }

    const url = new URL(request.url);
    const limit = clampLimit(parsePositiveInt(url.searchParams.get('limit'), DEFAULT_LIMIT));
    const offset = parseNonNegInt(url.searchParams.get('offset'), 0);

    const db = getServiceClient();
    const { data, error } = await db.rpc('opsly_admin_tenants_page', {
      p_limit: limit,
      p_offset: offset,
    });
    if (error) {
      console.error('opsly_admin_tenants_page', error);
      return Response.json(
        { error: 'Tenants query failed' },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    const page = asTenantsPage(data as Json);
    if (!page) {
      return Response.json(
        { error: 'Invalid tenants payload' },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    return Response.json({
      limit,
      offset,
      total: page.total,
      tenants: page.items,
    });
  });
}
