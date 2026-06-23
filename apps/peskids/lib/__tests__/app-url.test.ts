import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getPeskidsPublicBaseUrl,
  isLocalhostLikeOrigin,
  PESKIDS_APP_ORIGIN,
} from '../app-url';

describe('isLocalhostLikeOrigin', () => {
  it('detects localhost and loopback hosts', () => {
    expect(isLocalhostLikeOrigin('http://localhost:3004')).toBe(true);
    expect(isLocalhostLikeOrigin('https://127.0.0.1:3004')).toBe(true);
    expect(isLocalhostLikeOrigin('https://peskids.op-sly.com')).toBe(false);
  });
});

describe('getPeskidsPublicBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses production fallback when localhost env is set in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_SITE_URL', 'http://localhost:3004');

    expect(getPeskidsPublicBaseUrl()).toBe('https://peskids.op-sly.com');
  });

  it('allows localhost in development', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_SITE_URL', '');
    vi.stubEnv('PESKIDS_PUBLIC_URL', '');

    expect(getPeskidsPublicBaseUrl()).toBe('http://localhost:3004');
  });

  it('prefers PESKIDS_PUBLIC_URL when set to production host', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('PESKIDS_PUBLIC_URL', 'https://peskids.op-sly.com');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_SITE_URL', 'http://localhost:3004');

    expect(getPeskidsPublicBaseUrl()).toBe('https://peskids.op-sly.com');
  });
});

describe('PESKIDS_APP_ORIGIN', () => {
  it('is defined as a non-empty URL string', () => {
    expect(PESKIDS_APP_ORIGIN).toMatch(/^https?:\/\//);
  });
});
