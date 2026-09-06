import { afterEach, describe, expect, it } from 'vitest';

import { getAuthPublicConfig } from '../auth-public-config';

describe('getAuthPublicConfig', () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
  });

  it('prefers NEXT_PUBLIC_* keys', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    const config = getAuthPublicConfig();
    expect(config.configured).toBe(true);
    expect(config.supabaseUrl).toBe('https://project.supabase.co');
    expect(config.supabaseAnonKey).toBe('anon-key');
  });

  it('accepts the dashboard publishable key alias', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://hljetbbgiphpjbldebpo.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    const config = getAuthPublicConfig();
    expect(config.configured).toBe(true);
    expect(config.supabaseAnonKey).toBe('sb_publishable_test');
  });

  it('falls back to SUPABASE_* runtime env', () => {
    process.env.SUPABASE_URL = 'https://runtime.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'runtime-anon';
    const config = getAuthPublicConfig();
    expect(config.configured).toBe(true);
    expect(config.supabaseUrl).toBe('https://runtime.supabase.co');
  });

  it('reports not configured when empty', () => {
    expect(getAuthPublicConfig().configured).toBe(false);
  });
});
