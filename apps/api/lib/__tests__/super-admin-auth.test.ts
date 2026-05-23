import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

const baseUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    email: 'person@example.com',
    ...overrides,
  }) as User;

describe('isSuperAdminUser', () => {
  beforeEach(() => {
    delete process.env.OPSLY_SUPER_ADMIN_EMAILS;
  });

  it('accepts metadata-based super admins', async () => {
    const { isSuperAdminUser } = await import('../super-admin-auth');

    expect(
      isSuperAdminUser(
        baseUser({
          user_metadata: { role: 'admin' },
        })
      )
    ).toBe(true);
  });

  it('accepts the owner email allowlist by default', async () => {
    const { isSuperAdminUser } = await import('../super-admin-auth');

    expect(
      isSuperAdminUser(
        baseUser({
          email: 'cboteros1@gmail.com',
        })
      )
    ).toBe(true);
  });

  it('accepts configurable allowlist emails', async () => {
    process.env.OPSLY_SUPER_ADMIN_EMAILS = 'alice@example.com, bob@example.com ';
    const { isSuperAdminUser } = await import('../super-admin-auth');

    expect(
      isSuperAdminUser(
        baseUser({
          email: 'bob@example.com',
        })
      )
    ).toBe(true);
  });

  it('rejects non-admin non-allowlisted users', async () => {
    const { isSuperAdminUser } = await import('../super-admin-auth');

    expect(isSuperAdminUser(baseUser())).toBe(false);
  });
});
