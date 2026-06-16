import { describe, expect, it } from 'vitest';
import {
  appendRecoveryCallbackParam,
  PASSWORD_RECOVERY_CALLBACK_PARAM,
  PASSWORD_RECOVERY_STORAGE_KEY,
} from '../password-recovery-session';

describe('password-recovery-session', () => {
  it('appends recovery intent query param to relative paths', () => {
    expect(appendRecoveryCallbackParam('/auth/recovery')).toBe(
      `/auth/recovery?${PASSWORD_RECOVERY_CALLBACK_PARAM}=1`
    );
  });

  it('uses a peskids-specific sessionStorage key', () => {
    expect(PASSWORD_RECOVERY_STORAGE_KEY).toContain('peskids');
  });
});
