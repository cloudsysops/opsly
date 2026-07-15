import { describe, expect, it } from 'vitest';
import { parseUnblockAdminArgs } from '../../../../scripts/peskids/unblock-admin-access.args';

describe('parseUnblockAdminArgs', () => {
  it('defaults to preserve password for existing-user unblock', () => {
    expect(parseUnblockAdminArgs(['peskids.admin@gmail.com'])).toEqual({
      email: 'peskids.admin@gmail.com',
      passwordMode: 'preserve',
    });
  });

  it('treats --keep-password as preserve (backward compatible)', () => {
    expect(
      parseUnblockAdminArgs(['peskids.admin@gmail.com', '--keep-password'])
    ).toEqual({
      email: 'peskids.admin@gmail.com',
      passwordMode: 'preserve',
    });
  });

  it('requires explicit flag to set password from env', () => {
    expect(
      parseUnblockAdminArgs(['peskids.admin@gmail.com', '--set-password-from-env'])
    ).toEqual({
      email: 'peskids.admin@gmail.com',
      passwordMode: 'from-env',
    });
  });

  it('requires explicit flag to reset temp password', () => {
    expect(
      parseUnblockAdminArgs(['peskids.admin@gmail.com', '--reset-temp-password'])
    ).toEqual({
      email: 'peskids.admin@gmail.com',
      passwordMode: 'reset-temp',
    });
  });

  it('rejects conflicting password flags', () => {
    expect(() =>
      parseUnblockAdminArgs([
        'peskids.admin@gmail.com',
        '--set-password-from-env',
        '--reset-temp-password',
      ])
    ).toThrow(/only one/i);
  });
});
