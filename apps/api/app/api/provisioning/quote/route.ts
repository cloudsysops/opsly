import { NextResponse } from 'next/server';
import { z } from 'zod';

import { opslyManagementFeeUsd } from '../../../../lib/cloud-providers/fees';
import type { CloudProviderId, ProvisioningPlan } from '../../../../lib/cloud-providers/interface';
import { getCloudProvider } from '../../../../lib/cloud-providers/registry';
import { HTTP_STATUS } from '../../../../lib/constants';

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

/**
 * POST /api/provisioning/quote — cotización infra (proveedor) + fee Opsly (sin persistir aún).
 * Público para onboarding; no incluye secretos del cliente.
 */
export async function POST(request: Request): Promise<Response> {
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
    const adapter = getCloudProvider(provider);
    const estimate = await adapter.estimateProvisioningCost(plan as ProvisioningPlan);
    const opslyFee = opslyManagementFeeUsd(plan as ProvisioningPlan);
    const cloudUsd = estimate.monthlyEstimate;
    const total = cloudUsd + opslyFee;

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { error: 'quote_failed', message: msg },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
