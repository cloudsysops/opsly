import { describe, expect, it } from 'vitest';
import { extractSupabaseAccessTokenFromCookies } from '../supabase-auth-cookie';

function encodeSession(accessToken: string): string {
  const payload = Buffer.from(JSON.stringify({ access_token: accessToken }), 'utf8').toString(
    'base64'
  );
  return `base64-${payload}`;
}

describe('extractSupabaseAccessTokenFromCookies', () => {
  it('reads an unchunked Supabase SSR auth cookie', () => {
    const cookie = encodeSession('staff-token');

    expect(
      extractSupabaseAccessTokenFromCookies([{ name: 'sb-project-auth-token', value: cookie }])
    ).toBe('staff-token');
  });

  it('reassembles chunked Supabase SSR auth cookies in numeric order', () => {
    const cookie = encodeSession('chunked-staff-token');
    const splitAt = Math.floor(cookie.length / 2);

    expect(
      extractSupabaseAccessTokenFromCookies([
        { name: 'sb-project-auth-token.1', value: cookie.slice(splitAt) },
        { name: 'sb-project-auth-token.0', value: cookie.slice(0, splitAt) },
      ])
    ).toBe('chunked-staff-token');
  });

  it('returns an empty token for malformed or incomplete cookies', () => {
    expect(
      extractSupabaseAccessTokenFromCookies([
        { name: 'sb-project-auth-token.0', value: 'base64-invalid' },
      ])
    ).toBe('');
  });
});
