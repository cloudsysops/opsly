import type { User } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';

import type { TrustedPortalSession } from '../portal-trusted-identity';
import { tenantSlugMatchesSession } from '../portal-trusted-identity';
import type { PortalTenantRow } from '../portal-me';
import { getTenantContext, runWithTenantContext, tryGetTenantContext } from '../tenant-context';

function makeSession(slug: string): TrustedPortalSession {
  const tenant: PortalTenantRow = {
    id: '00000000-0000-4000-8000-000000000001',
    slug,
    name: 'Test',
    owner_email: 'owner@test.com',
    plan: 'startup',
    status: 'active',
    services: {},
    created_at: '2026-01-01',
  };
  return { user: {} as User, tenant };
}

describe('tenant isolation — tenantSlugMatchesSession', () => {
  it('rejects path slug that differs by case (strict equality)', () => {
    const session = makeSession('acme');
    expect(tenantSlugMatchesSession(session, 'ACME')).toBe(false);
    expect(tenantSlugMatchesSession(session, 'acme')).toBe(true);
  });

  it('rejects homograph / confusable slug when not exact match', () => {
    const session = makeSession('acme');
    expect(tenantSlugMatchesSession(session, 'acme ')).toBe(false);
    expect(tenantSlugMatchesSession(session, ' acme')).toBe(false);
  });

  it('allows slug with hyphen when tenant slug matches exactly', () => {
    const session = makeSession('smile-trip-care');
    expect(tenantSlugMatchesSession(session, 'smile-trip-care')).toBe(true);
    expect(tenantSlugMatchesSession(session, 'smile_tripcare')).toBe(false);
  });

  it('never treats empty path slug as matching a real tenant', () => {
    const session = makeSession('acme');
    expect(tenantSlugMatchesSession(session, '')).toBe(false);
  });
});

describe('tenant isolation — AsyncLocalStorage (tenant-context)', () => {
  it('nested runWithTenantContext: inner tenant visible inside inner; outer restored after', async () => {
    await runWithTenantContext({ tenantId: 'outer-id', tenantSlug: 'outer' }, async () => {
      expect(getTenantContext().tenantSlug).toBe('outer');
      await runWithTenantContext({ tenantId: 'inner-id', tenantSlug: 'inner' }, async () => {
        expect(getTenantContext().tenantSlug).toBe('inner');
        expect(getTenantContext().tenantId).toBe('inner-id');
      });
      expect(getTenantContext().tenantSlug).toBe('outer');
      expect(getTenantContext().tenantId).toBe('outer-id');
    });
    expect(tryGetTenantContext()).toBeNull();
  });

  it('parallel runs do not leak tenant slug across concurrent branches', async () => {
    const delays = [15, 5, 10];
    const slugs = ['tenant-a', 'tenant-b', 'tenant-c'] as const;
    await Promise.all(
      slugs.map((slug, i) =>
        runWithTenantContext({ tenantId: `id-${slug}`, tenantSlug: slug }, async () => {
          await new Promise<void>((resolve) => {
            setTimeout(resolve, delays[i] ?? 0);
          });
          expect(getTenantContext().tenantSlug).toBe(slug);
        })
      )
    );
    expect(tryGetTenantContext()).toBeNull();
  });

  it('setTenantContext is not global: after run completes, context is cleared', async () => {
    await runWithTenantContext({ tenantId: 'x', tenantSlug: 'once' }, async () => {
      expect(getTenantContext().tenantSlug).toBe('once');
    });
    expect(tryGetTenantContext()).toBeNull();
  });
});
