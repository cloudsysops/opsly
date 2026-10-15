import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

import {
  SupabaseConfigMissingError,
  createRequiredAuthClient,
  readSupabasePublicConfig,
} from '../supabase/client';

const REAL_URL = 'https://project.supabase.co';
const REAL_KEY = 'sb_publishable_test_key';

describe('readSupabasePublicConfig', () => {
  const saved = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    for (const [key, value] of [
      ['NEXT_PUBLIC_SUPABASE_URL', saved.url],
      ['NEXT_PUBLIC_SUPABASE_ANON_KEY', saved.anonKey],
    ] as const) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('returns the config when both public vars are set', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REAL_KEY;

    assert.deepEqual(readSupabasePublicConfig(), {
      url: REAL_URL,
      anonKey: REAL_KEY,
    });
  });

  it('trims surrounding whitespace', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = `  ${REAL_URL}  `;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = `\t${REAL_KEY}\n`;

    assert.deepEqual(readSupabasePublicConfig(), {
      url: REAL_URL,
      anonKey: REAL_KEY,
    });
  });

  it('returns null when the url is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REAL_KEY;

    assert.equal(readSupabasePublicConfig(), null);
  });

  it('returns null when the anon key is missing', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;

    assert.equal(readSupabasePublicConfig(), null);
  });

  it('returns null when both are missing', () => {
    assert.equal(readSupabasePublicConfig(), null);
  });

  it('treats a blank value as missing instead of configuring an empty endpoint', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = '   ';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = '';

    assert.equal(readSupabasePublicConfig(), null);
  });
});

describe('createRequiredAuthClient', () => {
  const saved = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  afterEach(() => {
    for (const [key, value] of [
      ['NEXT_PUBLIC_SUPABASE_URL', saved.url],
      ['NEXT_PUBLIC_SUPABASE_ANON_KEY', saved.anonKey],
    ] as const) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('throws instead of falling back to a placeholder endpoint', () => {
    assert.throws(
      () => createRequiredAuthClient(),
      (error: unknown) => {
        assert.ok(error instanceof SupabaseConfigMissingError);
        const message = (error as Error).message;
        assert.match(message, /NEXT_PUBLIC_SUPABASE_URL/);
        assert.match(message, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
        assert.doesNotMatch(message, /placeholder/i);
        return true;
      }
    );
  });

  it('names only the missing variable', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;

    assert.throws(
      () => createRequiredAuthClient(),
      (error: unknown) => {
        const message = (error as Error).message;
        assert.match(message, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
        assert.doesNotMatch(message, /NEXT_PUBLIC_SUPABASE_URL/);
        return true;
      }
    );
  });

  it('builds a client when the config is present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = REAL_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = REAL_KEY;

    const client = createRequiredAuthClient();

    assert.ok(client.auth);
  });
});