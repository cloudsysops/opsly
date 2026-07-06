import { resolveTwentyEnv } from '@intcloudsysops/services/twenty';
import { resolveWacrmForTenant } from '@intcloudsysops/wacrm-channel';
import { resolveWompiForTenant } from '@intcloudsysops/wompi-gateway';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export type IntegrationStatus = 'connected' | 'disabled' | 'not_configured';

export interface IntegrationsStatus {
  twenty: { status: IntegrationStatus; label: string };
  wacrm: { status: IntegrationStatus; label: string };
  wompi: { status: IntegrationStatus; label: string };
  stripe: { status: IntegrationStatus; label: string };
}

/**
 * Reads env-derived config only — no live network calls to any provider.
 * "connected" here means "credentials configured and enabled", not "verified
 * reachable right now". Good enough for an at-a-glance dashboard signal;
 * a real health check would need each provider's own ping endpoint.
 */
export function getIntegrationsStatus(): IntegrationsStatus {
  const slug = tenantSlug();

  const twentyEnv = resolveTwentyEnv();
  const twenty: { status: IntegrationStatus; label: string } = twentyEnv.enabled
    ? { status: 'connected', label: 'Conectado' }
    : { status: 'not_configured', label: 'No configurado' };

  const wacrmEnv = resolveWacrmForTenant(slug);
  const wacrm: { status: IntegrationStatus; label: string } =
    wacrmEnv?.enabled ? { status: 'connected', label: 'Conectado' } : { status: 'disabled', label: 'Deshabilitado' };

  const wompiEnv = resolveWompiForTenant(slug);
  const wompi: { status: IntegrationStatus; label: string } =
    wompiEnv?.enabled ? { status: 'connected', label: 'Conectado' } : { status: 'disabled', label: 'Deshabilitado' };

  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY?.trim());
  const stripe: { status: IntegrationStatus; label: string } = stripeConfigured
    ? { status: 'connected', label: 'Conectado' }
    : { status: 'not_configured', label: 'No configurado' };

  return { twenty, wacrm, wompi, stripe };
}
