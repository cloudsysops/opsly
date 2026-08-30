import { describe, expect, it } from 'vitest';
import {
  adaptCanonicalPeskidsSession,
  toFranchiseUiSession,
  unitIdsForScope,
} from '../franchise-session';

const user = {
  id: 'user-1',
  email: 'owner@peskids.com',
  user_metadata: { tenant_slug: 'other-tenant', role: 'support' },
  app_metadata: { tenant_slug: 'peskids', role: 'owner' },
};

describe('canonical Peskids franchise session adapter', () => {
  it('always emits the peskids tenant and gives owner global unit scope', () => {
    const session = adaptCanonicalPeskidsSession({ user, memberships: [] });
    expect(session?.tenantSlug).toBe('peskids');
    expect(unitIdsForScope(session!)).toBe('all');
    expect(toFranchiseUiSession(session!, user).unitScope).toBe('all');
  });

  it('ignores editable user metadata and keeps peskids server-side', () => {
    const session = adaptCanonicalPeskidsSession({
      user,
      memberships: [],
    });
    expect(session?.tenantSlug).toBe('peskids');
  });

  it('limits support to active assigned units', () => {
    const session = adaptCanonicalPeskidsSession({
      user: {
        ...user,
        user_metadata: { tenant_slug: 'peskids', role: 'support' },
        app_metadata: {},
      },
      memberships: [
        {
          user_id: 'user-1',
          franchise_id: 'llano',
          role: 'support',
          active: true,
          tenant_slug: 'peskids',
        },
        {
          user_id: 'user-1',
          franchise_id: 'domicilios',
          role: 'support',
          active: false,
          tenant_slug: 'peskids',
        },
        {
          user_id: 'user-2',
          franchise_id: 'other',
          role: 'support',
          active: true,
          tenant_slug: 'peskids',
        },
      ],
    });
    expect(session?.franchiseUnitIds).toEqual(['llano']);
    expect(unitIdsForScope(session!)).toEqual(['llano']);
  });

  it('fails closed for teacher and unassigned users', () => {
    expect(
      adaptCanonicalPeskidsSession({
        user: {
          ...user,
          user_metadata: { tenant_slug: 'peskids', role: 'teacher' },
          app_metadata: {},
        },
        memberships: [],
      })
    ).toBeNull();
    expect(
      adaptCanonicalPeskidsSession({
        user: {
          ...user,
          user_metadata: { tenant_slug: 'peskids', role: 'support' },
          app_metadata: {},
        },
        memberships: [],
      })
    ).toBeNull();
  });
});
