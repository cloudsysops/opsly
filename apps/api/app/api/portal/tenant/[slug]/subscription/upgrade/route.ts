import { NextRequest } from 'next/server';
import { z } from 'zod';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import {
  resolveTrustedPortalSession,
  tenantSlugMatchesSession,
} from '../../../../../../../lib/portal-trusted-identity';
import { getServiceClient } from '../../../../../../../lib/supabase';
import { getStripe } from '../../../../../../../lib/stripe';
import { logger } from '../../../../../../../lib/logger';

const upgradeBodySchema = z.object({
  plan: z.enum(['business', 'enterprise']),
});

function getUpgradePriceId(plan: 'business' | 'enterprise'): string {
  const map: Record<'business' | 'enterprise', string> = {
    business: process.env.STRIPE_PRICE_ID_BUSINESS ?? '',
    enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE ?? '',
  };
  return map[plan];
}

async function getTenantStripeSubId(tenantId: string): Promise<string | null> {
  const db = getServiceClient();
  const { data, error } = await db
    .schema('platform')
    .from('tenants')
    .select('stripe_subscription_id')
    .eq('id', tenantId)
    .maybeSingle();

  if (error) {
    logger.error('upgrade getTenantStripeSubId', error);
    return null;
  }
  const row = data as { stripe_subscription_id?: string | null } | null;
  return row?.stripe_subscription_id ?? null;
}

async function updateTenantPlan(tenantId: string, plan: string): Promise<void> {
  const db = getServiceClient();
  const { error } = await db.schema('platform').from('tenants').update({ plan }).eq('id', tenantId);
  if (error) {
    logger.error('upgrade updateTenantPlan', error);
  }
}

async function upgradeStripeSubscription(
  subId: string,
  newPriceId: string,
  newPlan: string
): Promise<void> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subId, {
    expand: ['items.data.price'],
  });
  const itemId = sub.items.data[0]?.id;
  if (!itemId) {
    throw new Error('No subscription item found to upgrade');
  }
  await stripe.subscriptions.update(subId, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: 'always_invoice',
    metadata: { plan: newPlan },
  });
}

type ParsedBody = { ok: true; plan: 'business' | 'enterprise' } | { ok: false; response: Response };

async function parseUpgradeBody(request: NextRequest): Promise<ParsedBody> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST }),
    };
  }
  const parsed = upgradeBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid body' },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }
  return { ok: true, plan: parsed.data.plan };
}

/**
 * POST /api/portal/tenant/[slug]/subscription/upgrade
 *
 * Permite al titular del tenant cambiar de plan (startup → business/enterprise).
 * Zero-Trust: Bearer JWT + slug del path debe coincidir con el tenant de la sesión.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  const { slug } = await context.params;
  if (!tenantSlugMatchesSession(trusted.session, slug)) {
    return Response.json(
      { error: 'Tenant slug does not match session' },
      { status: HTTP_STATUS.FORBIDDEN }
    );
  }

  const bodyResult = await parseUpgradeBody(request);
  if (!bodyResult.ok) {
    return bodyResult.response;
  }

  const { plan } = bodyResult;
  const priceId = getUpgradePriceId(plan);
  if (!priceId) {
    return Response.json(
      { error: `STRIPE_PRICE_ID_${plan.toUpperCase()} not configured` },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  const subId = await getTenantStripeSubId(trusted.session.tenant.id);
  if (!subId) {
    return Response.json(
      { error: 'No active subscription found' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  try {
    await upgradeStripeSubscription(subId, priceId, plan);
  } catch (e) {
    logger.error(
      'upgrade upgradeStripeSubscription',
      e instanceof Error ? e : { error: String(e) }
    );
    return Response.json(
      { error: 'Failed to upgrade subscription' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  await updateTenantPlan(trusted.session.tenant.id, plan);

  return Response.json({ ok: true, plan });
}
