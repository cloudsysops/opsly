import { describe, expect, it } from 'vitest';
import { isPeskidsFranchiseOsEnabled } from '@/lib/peskids-pro-flags';

describe('Franchise OS production gate', () => {
  it('defaults unfinished franchise write APIs to off', () => {
    expect(isPeskidsFranchiseOsEnabled({})).toBe(false);
    expect(isPeskidsFranchiseOsEnabled({ PESKIDS_FRANCHISE_OS_ENABLED: 'false' })).toBe(false);
    expect(isPeskidsFranchiseOsEnabled({ PESKIDS_FRANCHISE_OS_ENABLED: 'true' })).toBe(true);
  });
});
