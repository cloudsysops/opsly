import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getConfig, getFeatureFlags } from '../index';

describe('getConfig', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns defaults when no env vars set', () => {
    delete process.env.NODE_ENV;
    delete process.env.LOG_LEVEL;
    delete process.env.REDIS_URL;
    delete process.env.DATABASE_URL;
    delete process.env.AGENT_MAX_CONCURRENT;
    delete process.env.CACHE_TTL_SECONDS;

    const config = getConfig();
    expect(config.NODE_ENV).toBe('development');
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.REDIS_URL).toBe('redis://localhost:6379');
    expect(config.AGENT_MAX_CONCURRENT).toBe(10);
    expect(config.CACHE_TTL_SECONDS).toBe(3600);
    expect(config.EVALUATION_STRICT_MODE).toBe(false);
  });

  it('reads values from environment', () => {
    process.env.NODE_ENV = 'production';
    process.env.LOG_LEVEL = 'error';
    process.env.REDIS_URL = 'redis://custom:6380';
    process.env.AGENT_MAX_CONCURRENT = '50';
    process.env.EVALUATION_STRICT_MODE = 'true';
    process.env.CACHE_TTL_SECONDS = '7200';

    const config = getConfig();
    expect(config.NODE_ENV).toBe('production');
    expect(config.LOG_LEVEL).toBe('error');
    expect(config.REDIS_URL).toBe('redis://custom:6380');
    expect(config.AGENT_MAX_CONCURRENT).toBe(50);
    expect(config.EVALUATION_STRICT_MODE).toBe(true);
    expect(config.CACHE_TTL_SECONDS).toBe(7200);
  });

  it('parses AGENT_MAX_CONCURRENT as integer', () => {
    process.env.AGENT_MAX_CONCURRENT = '25';
    expect(getConfig().AGENT_MAX_CONCURRENT).toBe(25);
    expect(typeof getConfig().AGENT_MAX_CONCURRENT).toBe('number');
  });
});

describe('getFeatureFlags', () => {
  it('returns flags for a tenant', async () => {
    const flags = await getFeatureFlags('test-tenant');
    expect(flags).toHaveProperty('agentsV2Enabled');
    expect(flags).toHaveProperty('evaluationStrictMode');
    expect(flags).toHaveProperty('cacheEnabled');
    expect(flags).toHaveProperty('profilerEnabled');
    expect(typeof flags.cacheEnabled).toBe('boolean');
  });
});
