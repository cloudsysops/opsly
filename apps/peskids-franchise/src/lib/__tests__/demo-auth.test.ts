import { describe, expect, it } from 'vitest';
import { isFranchiseDemoAuthEnabled } from '../demo-auth';

describe('franchise demo auth guard', () => {
  it('is disabled in production even when configured', () => {
    expect(isFranchiseDemoAuthEnabled({ nodeEnv: 'production', configured: 'true' })).toBe(false);
  });

  it('requires explicit opt-in outside production', () => {
    expect(isFranchiseDemoAuthEnabled({ nodeEnv: 'development', configured: 'false' })).toBe(false);
    expect(isFranchiseDemoAuthEnabled({ nodeEnv: 'test', configured: 'true' })).toBe(true);
  });
});
