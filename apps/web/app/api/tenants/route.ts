import { z } from 'zod';
import { OnboardingOrchestrator } from '../../../lib/onboarding/orchestrator';
import { adminClient } from '../../../lib/supabase/admin';
import type { TenantStatus } from '../../../lib/supabase/types';

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum(['provisioning', 'configuring', 'deploying', 'active', 'suspended', 'failed', 'deleted'])
    .optional(),
  plan: z.enum(['startup', 'business', 'enterprise', 'demo']).optional(),
});

const createBodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  owner_email: z.string().email(),
  plan: z.enum(['startup', 'business', 'enterprise', 'demo']),
  stripe_customer_id: z.string().min(1).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = listQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { page, limit, status, plan } = parsed.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = adminClient
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
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({
    data: data ?? [],
    page,
    limit,
    total: count ?? 0,
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { slug, owner_email, plan, stripe_customer_id } = parsed.data;

  const orchestrator = new OnboardingOrchestrator(slug, owner_email, plan, stripe_customer_id);

  let tenantId: string;
  try {
    tenantId = await orchestrator.createAndBeginProvisioning();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create tenant';
    return Response.json({ error: message }, { status: 400 });
  }

  void orchestrator.runProvisioningPipeline().catch((err: unknown) => {
    console.error('Onboarding pipeline error:', err);
  });

  return Response.json({ tenantId, status: 'provisioning' as const }, { status: 202 });
}
