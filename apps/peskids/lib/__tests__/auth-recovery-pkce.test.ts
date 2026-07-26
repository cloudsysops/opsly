import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveRecoveryUpdatePath } from '../auth-callback';
import { recoveryExchangeErrorMessage } from '../auth-recovery-messages';
import { buildRecoveryRedirectTo, recoveryForwardPathFromUrl } from '../runtime/tenant-auth-routing';

const repoRoot = resolve(__dirname, '../..');

describe('buildRecoveryRedirectTo', () => {
  it('points reset emails at the server auth callback with next path', () => {
    expect(buildRecoveryRedirectTo('https://www.peskids.com')).toBe(
      'https://www.peskids.com/auth/callback?next=%2Fadmin%2Fupdate-password'
    );
    expect(
      buildRecoveryRedirectTo('https://www.peskids.com', { next: '/teacher/update-password' })
    ).toBe(
      'https://www.peskids.com/auth/callback?next=%2Fteacher%2Fupdate-password'
    );
  });
});

describe('recoveryForwardPathFromUrl', () => {
  it('routes PKCE code links to the server callback', () => {
    const url = new URL(
      'https://www.peskids.com/admin/login?code=abc&next=%2Fteacher%2Fupdate-password'
    );
    expect(recoveryForwardPathFromUrl(url)).toBe(
      '/auth/callback?code=abc&next=%2Fteacher%2Fupdate-password'
    );
  });

  it('keeps hash-only recovery on /auth/recovery for legacy emails', () => {
    const url = new URL('https://www.peskids.com/#access_token=x&type=recovery');
    expect(recoveryForwardPathFromUrl(url)).toBe('/auth/recovery#access_token=x&type=recovery');
  });
});

describe('recoveryExchangeErrorMessage', () => {
  it('maps PKCE verifier errors to a user-friendly Spanish message', () => {
    expect(
      recoveryExchangeErrorMessage('PKCE code verifier not found in storage')
    ).toContain('¿Olvidaste tu contraseña?');
  });

  it('passes through other errors unchanged', () => {
    expect(recoveryExchangeErrorMessage('Invalid code')).toBe('Invalid code');
  });
});

describe('resolveRecoveryUpdatePath', () => {
  it('prefers explicit next when it targets update-password', () => {
    const user = {
      user_metadata: { role: 'admin', tenant_slug: 'peskids' },
      app_metadata: {},
    } as never;
    expect(resolveRecoveryUpdatePath(user, '/support/update-password')).toBe(
      '/support/update-password'
    );
  });

  it('falls back to role-based update path from metadata', () => {
    const user = {
      user_metadata: { role: 'teacher', tenant_slug: 'peskids' },
      app_metadata: {},
    } as never;
    expect(resolveRecoveryUpdatePath(user, null)).toBe('/teacher/update-password');
  });
});

describe('auth recovery PKCE contract (regression guard)', () => {
  it('never exchanges PKCE codes in the client recovery handler', () => {
    const source = readFileSync(
      resolve(repoRoot, 'components/auth/auth-recovery-handler.tsx'),
      'utf8'
    );
    expect(source).not.toMatch(/exchangeCodeForSession/);
  });

  it('forwards PKCE codes from session redirect to auth callback', () => {
    const source = readFileSync(
      resolve(repoRoot, 'components/auth/auth-session-redirect.tsx'),
      'utf8'
    );
    expect(source).toMatch(/recoveryForwardPathFromUrl/);
    expect(source).not.toMatch(/\/auth\/recovery\$\{url\.search\}/);
  });

  it('verifies token_hash recovery on the server auth callback', () => {
    const source = readFileSync(resolve(repoRoot, 'app/auth/callback/route.ts'), 'utf8');
    expect(source).toMatch(/verifyOtp\(\{/);
    expect(source).toMatch(/token_hash:/);
  });

  it('exchanges legacy PKCE codes on the server recovery complete route', () => {
    const source = readFileSync(resolve(repoRoot, 'app/auth/recovery/complete/route.ts'), 'utf8');
    expect(source).toMatch(/exchangeCodeForSession/);
  });
});
