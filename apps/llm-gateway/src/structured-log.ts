/**
 * Líneas JSON en stdout para agregación (mismo espíritu que orchestrator job-log).
 */
export interface GatewayLogFields {
  event: 'llm_call_complete' | 'llm_call_error';
  tenant_slug: string;
  request_id: string;
  model_used?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_usd?: number;
  cache_hit?: boolean;
  latency_ms?: number;
  legacy_pipeline?: boolean;
  routing_bias?: string;
  provider_hint?: string;
  error?: string;
}

export function logGatewayEvent(fields: GatewayLogFields): void {
  const line = JSON.stringify({
    ...fields,
    ts: new Date().toISOString(),
    service: 'llm-gateway',
  });
  process.stdout.write(`${line}\n`);
}
