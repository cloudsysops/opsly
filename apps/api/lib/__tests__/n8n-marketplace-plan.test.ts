import { describe, expect, it } from 'vitest';
import { tenantPlanSupportsCatalogMin } from '../n8n-marketplace-plan';

describe('tenantPlanSupportsCatalogMin', () => {
  it('allows startup tenant for startup minimum', () => {
    expect(tenantPlanSupportsCatalogMin('startup', 'startup')).toBe(true);
  });

  it('allows business tenant for startup minimum', () => {
    expect(tenantPlanSupportsCatalogMin('business', 'startup')).toBe(true);
  });

  it('rejects startup tenant for enterprise minimum', () => {
    expect(tenantPlanSupportsCatalogMin('startup', 'enterprise')).toBe(false);
  });

  it('maps starter alias to startup rank', () => {
    expect(tenantPlanSupportsCatalogMin('starter', 'startup')).toBe(true);
  });

  it('rejects unknown tenant plan', () => {
    expect(tenantPlanSupportsCatalogMin('unknown', 'startup')).toBe(false);
  });
});
