import { describe, expect, it } from 'vitest';
import { isWacrmEnabledForTenant, resolveWacrmForTenant } from '../src/env-config.js';

describe('wacrm env-config', () => {
  it('defaults disabled when flag unset', () => {
    const cfg = resolveWacrmForTenant('peskids', {});
    expect(cfg?.enabled).toBe(false);
    expect(isWacrmEnabledForTenant('peskids', {})).toBe(false);
  });

  it('enables when flag and server URL set', () => {
    const env = {
      WACRM_PESKIDS_ENABLED: 'true',
      WACRM_PESKIDS_SERVER_URL: 'https://wa-peskids.op-sly.com',
      WACRM_PESKIDS_SYNC_TWENTY: 'notes-only',
    };
    expect(isWacrmEnabledForTenant('peskids', env)).toBe(true);
    expect(resolveWacrmForTenant('peskids', env)?.syncTwenty).toBe('notes-only');
  });

  it('maps intcloudsysops to INTCLOUDSYSOPS prefix', () => {
    const env = {
      WACRM_INTCLOUDSYSOPS_ENABLED: 'true',
      WACRM_INTCLOUDSYSOPS_SERVER_URL: 'https://wa-intcloudsysops.op-sly.com',
    };
    expect(isWacrmEnabledForTenant('intcloudsysops', env)).toBe(true);
  });
});
