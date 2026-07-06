import { describe, expect, it } from 'vitest';
import { isWompiEnabledForTenant, resolveWompiForTenant } from '../src/env-config.js';

describe('wompi env-config', () => {
  it('defaults disabled when flag unset', () => {
    const cfg = resolveWompiForTenant('peskids', {});
    expect(cfg?.enabled).toBe(false);
    expect(isWompiEnabledForTenant('peskids', {})).toBe(false);
  });

  it('enables when flag and keys are set', () => {
    const env = {
      WOMPI_PESKIDS_ENABLED: 'true',
      WOMPI_PESKIDS_PRIVATE_KEY: 'prv_test_abc123',
      WOMPI_PESKIDS_PUBLIC_KEY: 'pub_test_abc123',
      WOMPI_PESKIDS_EVENTS_SECRET: 'events-secret',
    };
    expect(isWompiEnabledForTenant('peskids', env)).toBe(true);
    expect(resolveWompiForTenant('peskids', env)?.privateKey).toBe('prv_test_abc123');
  });

  it('is null when enabled but missing required keys', () => {
    const env = { WOMPI_PESKIDS_ENABLED: 'true' };
    expect(resolveWompiForTenant('peskids', env)).toBeNull();
  });

  it('maps intcloudsysops to INTCLOUDSYSOPS prefix', () => {
    const env = {
      WOMPI_INTCLOUDSYSOPS_ENABLED: 'true',
      WOMPI_INTCLOUDSYSOPS_PRIVATE_KEY: 'prv_test_xyz',
      WOMPI_INTCLOUDSYSOPS_EVENTS_SECRET: 'secret',
    };
    expect(isWompiEnabledForTenant('intcloudsysops', env)).toBe(true);
  });
});
