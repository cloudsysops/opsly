import { NextResponse } from 'next/server';
import { z } from 'zod';

import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { opslyManagementFeeUsd } from '../../../../lib/cloud-providers/fees';
import type { CloudProviderId, ProvisioningPlan } from '../../../../lib/cloud-providers/interface';
import { getCloudProvider } from '../../../../lib/cloud-providers/registry';
import { HTTP_STATUS } from '../../../../lib/constants';
import { checkRateLimit } from '../../../../lib/rate-limiter';

const BodySchema = z.object({
  provider: z.enum(['aws', 'azure', 'gcp']),
  plan: z.enum(['free-tier', 'serverless-starter']),
});

function termsForProvider(provider: CloudProviderId): string {
  switch (provider) {
    case 'aws':
      return "Al hacer clic en 'Autorizar', aceptas que Opsly despliegue recursos en tu cuenta de AWS.";
    case 'azure':
      return "Al hacer clic en 'Autorizar', aceptas que Opsly despliegue recursos en tu suscripción de Azure.";
    case 'gcp':
      return "Al hacer clic en 'Autorizar', aceptas que Opsly despliegue recursos en tu proyecto de Google Cloud.";
    default: {
      const _n: never = provider;
      return _n;
    }
  }
}

async function calculateQuoteResponse(
  provider: CloudProviderId,
  plan: string,
  ip: string | null,
  userAgent: string | null
): Promise<Response> {
  const adapter = getCloudProvider(provider);
  const estimate = await adapter.estimateProvisioningCost(plan as ProvisioningPlan);
  const opslyFee = opslyManagementFeeUsd(plan as ProvisioningPlan);
  const cloudUsd = estimate.monthlyEstimate;
  const total = cloudUsd + opslyFee;

  void logAuditEvent({
    action: 'provisioning_quote_create',
    resource: `provisioning:${provider}:${plan}`,
    ip,
    user_agent: userAgent ?? undefined,
    metadata: { provider, plan, total_monthly_usd: total },
  });

  return NextResponse.json({
    provider,
    plan,
    cloud_cost_estimated_usd: cloudUsd,
    currency_cloud: estimate.currency,
    is_free_tier: estimate.isFreeTier,
    opsly_fee_usd: opslyFee,
    total_monthly_usd: total,
    line_items: estimate.lineItems ?? [],
    terms: termsForProvider(provider),
  });
}

/**
 * POST /api/provisioning/quote — cotización infra (proveedor) + fee Opsly (sin persistir aún).
 * Público para onboarding; no incluye secretos del cliente.
 */
export async function POST(request: Request): Promise<Response> {
  const ip = extractIp(request);
  const rateLimitKey = ip ? `provisioning-quote:${ip}` : 'provisioning-quote:anonymous';
  const rateLimit = await checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Demasiadas solicitudes. Inténtalo más tarde.' },
      { status: HTTP_STATUS.TOO_MANY_REQUESTS }
    );
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validación', details: parsed.error.flatten() },
      { status: HTTP_STATUS.UNPROCESSABLE }
    );
  }

  const { provider, plan } = parsed.data;

  if (provider !== 'aws') {
    return NextResponse.json(
      {
        error: 'provider_not_implemented',
        message: `Cotización para ${provider} disponible próximamente.`,
      },
      { status: HTTP_STATUS.NOT_IMPLEMENTED }
    );
  }

  try {
    return await calculateQuoteResponse(provider, plan, ip, request.headers.get('user-agent'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'quote_failed', message: msg },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
