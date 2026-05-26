import { describe, expect, it } from 'vitest';

import { getPlatformAgentRegistry, getPlatformTenantRegistry } from '../platform-foundation';

describe('platform foundation registry loaders', () => {
  it('loads the tenant registry from config', async () => {
    const registry = await getPlatformTenantRegistry();
    expect(registry.stages.length).toBeGreaterThan(0);
    expect(registry.items.length).toBeGreaterThan(0);
    expect(
      registry.by_stage.incubated_tenant + registry.by_stage.mvp_validation
    ).toBeGreaterThanOrEqual(0);
  });

  it('loads the agent registry from config', async () => {
    const registry = await getPlatformAgentRegistry();
    expect(registry.items.length).toBeGreaterThan(0);
    expect(registry.summary.total).toBe(registry.items.length);
  });
});
