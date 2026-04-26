import { afterEach, describe, expect, it, vi } from 'vitest';
import { logGatewayEvent } from '../src/structured-log.js';

describe('structured-log', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logGatewayEvent writes llm_call_complete JSON line', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    logGatewayEvent({
      event: 'llm_call_complete',
      tenant_slug: 't1',
      request_id: 'r1',
      model_used: 'haiku',
      tokens_input: 10,
      tokens_output: 5,
      cost_usd: 0.01,
      cache_hit: false,
      latency_ms: 100,
      legacy_pipeline: true,
    });
    const line = write.mock.calls[0][0] as string;
    const parsed: Record<string, unknown> = JSON.parse(line.trim());
    expect(parsed.service).toBe('llm-gateway');
    expect(parsed.event).toBe('llm_call_complete');
    expect(parsed.tenant_slug).toBe('t1');
    expect(parsed.request_id).toBe('r1');
    expect(parsed.model_used).toBe('haiku');
  });
});
