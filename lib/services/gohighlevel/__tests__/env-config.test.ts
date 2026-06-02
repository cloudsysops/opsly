import { describe, expect, it } from 'vitest';
import {
  GOHIGHLEVEL_DEFAULT_API_URL,
  resolveGoHighLevelEnv,
  resolveGoHighLevelPeskidsEnv,
  isGoHighLevelConfigured,
  isGoHighLevelPeskidsConfigured,
} from '../env-config.js';

describe('resolveGoHighLevelEnv', () => {
  it('defaults to LeadConnector private integration settings', () => {
    const config = resolveGoHighLevelEnv({});
    expect(config.baseUrl).toBe(GOHIGHLEVEL_DEFAULT_API_URL);
    expect(config.apiVersion).toBe('2021-07-28');
    expect(config.usesLeadConnector).toBe(true);
    expect(config.apiKey).toBe('');
  });

  it('detects legacy API host', () => {
    const config = resolveGoHighLevelEnv({
      GOHIGHLEVEL_API_URL: 'https://api.gohighlevel.com',
    });
    expect(config.usesLeadConnector).toBe(false);
  });

  it('reads tenant-scoped ids from env', () => {
    const config = resolveGoHighLevelEnv({
      GOHIGHLEVEL_API_KEY: 'pit-test',
      GOHIGHLEVEL_LOCATION_ID: 'loc-1',
      GOHIGHLEVEL_PRIVATE_INTEGRATION_ID: 'int-1',
    });
    expect(isGoHighLevelConfigured({ GOHIGHLEVEL_API_KEY: 'pit-test' })).toBe(true);
    expect(config.locationId).toBe('loc-1');
    expect(config.privateIntegrationId).toBe('int-1');
  });
});

describe('resolveGoHighLevelPeskidsEnv', () => {
  it('reads Peskids-scoped secrets without agency key', () => {
    const config = resolveGoHighLevelPeskidsEnv({
      GOHIGHLEVEL_PESKIDS_API_KEY: 'pit-peskids',
      GOHIGHLEVEL_PESKIDS_LOCATION_ID: 'KJ5LawrOOe3hIerqtMRu',
      GOHIGHLEVEL_PESKIDS_PRIVATE_INTEGRATION_ID: '6a1e407730bb8f804a59d247',
    });
    expect(isGoHighLevelPeskidsConfigured({ GOHIGHLEVEL_PESKIDS_API_KEY: 'pit-peskids' })).toBe(
      true
    );
    expect(config.locationId).toBe('KJ5LawrOOe3hIerqtMRu');
    expect(config.apiKey).toBe('pit-peskids');
  });
});
