import { randomUUID } from 'node:crypto';
import { logUsage } from '@intcloudsysops/llm-gateway';

const SHIELD_OBSERVABILITY_MODEL = 'shield_api_observability';

/**
 * Records a zero-token Hermes / usage_events row for OpenClaw observability.
 * `request_id` embeds tenant_slug for traceability (format: shield:{slug}:{uuid}).
 */
export async function meterShieldApiCall(params: {
  tenant_slug: string;
  request_id?: string;
  feature: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const requestId = params.request_id ?? `shield:${params.tenant_slug}:${randomUUID()}`;
  await logUsage({
    tenant_slug: params.tenant_slug,
    model: SHIELD_OBSERVABILITY_MODEL,
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
    cache_hit: false,
    request_id: requestId,
    created_at: new Date().toISOString(),
    feature: params.feature,
    metadata: params.metadata,
  });
  return requestId;
}
