import { afterEach, describe, expect, it, vi } from 'vitest';
import * as lg from '@intcloudsysops/llm-gateway';
import { meterShieldApiCall } from '../shield-metering';

vi.mock('@intcloudsysops/llm-gateway', () => ({
  logUsage: vi.fn(),
}));

describe('meterShieldApiCall', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('calls logUsage with tenant_slug and shield request_id prefix', async () => {
    const id = await meterShieldApiCall({
      tenant_slug: 'acme',
      feature: 'test',
    });
    expect(id.startsWith('shield:acme:')).toBe(true);
    expect(vi.mocked(lg.logUsage)).toHaveBeenCalledTimes(1);
    const arg = vi.mocked(lg.logUsage).mock.calls[0][0];
    expect(arg.tenant_slug).toBe('acme');
    expect(arg.model).toBe('shield_api_observability');
    expect(arg.tokens_input).toBe(0);
    expect(arg.feature).toBe('test');
  });
});
