import { jsonError, parseJsonBody, serverErrorLogged, tryRoute } from '../../../lib/api-response';
import { requireAdminAccess, requireAdminAccessUnlessDemoRead } from '../../../lib/auth';
import { HTTP_STATUS } from '../../../lib/constants';
import { logger } from '../../../lib/logger';
import { provisionTenant } from '../../../lib/orchestrator';
import { getServiceClient } from '../../../lib/supabase';
import type { TenantStatus } from '../../../lib/supabase/types';
import {
  CreateTenantSchema,
  ListTenantsQuerySchema,
  formatZodError,
} from '../../../lib/validation';

function isUniqueViolation(message: string, code: string | undefined): boolean {
  return (
    code === '23505' || message.includes('duplicate key') || message.includes('unique constraint')
  );
}

const TENANT_ROUTE_PERSISTENCE_CHECK = {
  MAX_ATTEMPTS: 5,
  SLEEP_MS: 150,
} as const;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function assertTenantPersisted(tenantId: string): Promise<void> {
  for (let attempt = 1; attempt <= TENANT_ROUTE_PERSISTENCE_CHECK.MAX_ATTEMPTS; attempt += 1) {
    const { data, error } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('id, deleted_at')
      .eq('id', tenantId)
      .maybeSingle();

    if (error) {
      throw new Error(`Tenant post-check failed: ${error.message}`);
    }
    if (data && data.deleted_at === null) {
      return;
    }
    if (data && data.deleted_at !== null) {
      throw new Error(`Tenant post-check failed: tenant ${tenantId} is soft-deleted`);
    }
    if (attempt < TENANT_ROUTE_PERSISTENCE_CHECK.MAX_ATTEMPTS) {
      await sleep(TENANT_ROUTE_PERSISTENCE_CHECK.SLEEP_MS);
    }
  }
  logger.error('tenant.route.post_check_not_found', {
    tenant_id: tenantId,
    attempts: TENANT_ROUTE_PERSISTENCE_CHECK.MAX_ATTEMPTS,
  });
  throw new Error(`Tenant post-check failed: tenant ${tenantId} not found`);
}

export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/tenants', async () => {
    const authError = await requireAdminAccessUnlessDemoRead(request);
    if (authError) {
      return authError;
    }

    const url = new URL(request.url);
    const parsed = ListTenantsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const { page, limit, status, plan } = parsed.data;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (status !== undefined) {
      query = query.eq('status', status as TenantStatus);
    }
    if (plan !== undefined) {
      query = query.eq('plan', plan);
    }

    const { data, error, count } = await query;

    if (error) {
      return serverErrorLogged('List tenants:', error);
    }

    return Response.json({
      data: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  });
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = CreateTenantSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const { slug, owner_email, plan, stripe_customer_id } = parsed.data;

  try {
    logger.info('tenant.route.create.request', { slug, owner_email, plan });
    const result = await provisionTenant({
      slug,
      owner_email,
      plan,
      stripe_customer_id,
    });
    await assertTenantPersisted(result.id);
    logger.info('tenant.route.create.accepted', { tenant_id: result.id, slug: result.slug });
    return Response.json(
      { id: result.id, slug: result.slug, status: result.status },
      { status: 202 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create tenant';
    if (isUniqueViolation(message, (err as { code?: string }).code)) {
      return jsonError('Slug already exists', HTTP_STATUS.CONFLICT);
    }
    return serverErrorLogged('POST /tenants:', err);
  }
}
