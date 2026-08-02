import { describe, expect, it } from 'vitest';
import {
  isIntcloudsysopsTwentyConfigured,
  isPeskidsGhlEnabled,
  isTwentyConfigured,
  resolveTwentyEnv,
  resolveTwentyEnvForIntcloudsysops,
} from '../env-config.js';

describe('resolveTwentyEnv', () => {
  it('requires api url and key to be configured', () => {
    expect(resolveTwentyEnv({})).toEqual({
      apiKey: '',
      baseUrl: '',
      defaultOpportunityStage: 'NEW',
      enabled: false,
    });
  });

  it('enables Twenty when credentials are present', () => {
    const config = resolveTwentyEnv({
      TWENTY_API_URL: 'https://crm-peskids.op-sly.com',
      TWENTY_API_KEY: 'secret-key',
    });
    expect(isTwentyConfigured({
      TWENTY_API_URL: 'https://crm-peskids.op-sly.com',
      TWENTY_API_KEY: 'secret-key',
    })).toBe(true);
    expect(config.baseUrl).toBe('https://crm-peskids.op-sly.com');
    expect(config.defaultOpportunityStage).toBe('NEW');
  });

  it('respects PESKIDS_TWENTY_ENABLED=false', () => {
    expect(
      isTwentyConfigured({
        TWENTY_API_URL: 'https://crm-peskids.op-sly.com',
        TWENTY_API_KEY: 'secret-key',
        PESKIDS_TWENTY_ENABLED: 'false',
      })
    ).toBe(false);
  });
});

describe('isPeskidsGhlEnabled', () => {
  it('defaults to false (migration off GHL)', () => {
    expect(isPeskidsGhlEnabled({})).toBe(false);
    expect(isPeskidsGhlEnabled({ GOHIGHLEVEL_PESKIDS_API_KEY: 'pit-test' })).toBe(false);
  });

  it('requires explicit opt-in', () => {
    expect(isPeskidsGhlEnabled({ PESKIDS_GHL_ENABLED: 'true' })).toBe(true);
  });
});

describe('resolveTwentyEnvForIntcloudsysops', () => {
  it('prefers tenant-specific env vars', () => {
    const config = resolveTwentyEnvForIntcloudsysops({
      TWENTY_INTCLOUDSYSOPS_API_URL: 'https://crm-icso.op-sly.com',
      TWENTY_INTCLOUDSYSOPS_API_KEY: 'icso-key',
    });
    expect(config.baseUrl).toBe('https://crm-icso.op-sly.com');
    expect(config.apiKey).toBe('icso-key');
    expect(isIntcloudsysopsTwentyConfigured({
      TWENTY_INTCLOUDSYSOPS_API_URL: 'https://crm-icso.op-sly.com',
      TWENTY_INTCLOUDSYSOPS_API_KEY: 'icso-key',
    })).toBe(true);
  });

  it('respects INTCLOUDSYSOPS_TWENTY_ENABLED=false', () => {
    expect(
      isIntcloudsysopsTwentyConfigured({
        TWENTY_API_URL: 'https://crm.op-sly.com',
        TWENTY_API_KEY: 'key',
        INTCLOUDSYSOPS_TWENTY_ENABLED: 'false',
      })
    ).toBe(false);
  });
});
