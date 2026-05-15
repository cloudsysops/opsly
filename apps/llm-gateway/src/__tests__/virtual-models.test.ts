import { describe, expect, it } from 'vitest';
import { resolveRoutingPreference } from '../providers.js';

describe('opsly virtual model aliases', () => {
  it('maps opsly:fast to cheap routing', () => {
    expect(resolveRoutingPreference('opsly:fast', 2)).toBe('cheap');
  });

  it('maps opsly:coding to code routing', () => {
    expect(resolveRoutingPreference('opsly:coding', 2)).toBe('code');
  });

  it('maps opsly:balanced to balanced routing', () => {
    expect(resolveRoutingPreference('opsly:balanced', 2)).toBe('balanced');
  });

  it('maps opsly:quality to sonnet routing', () => {
    expect(resolveRoutingPreference('opsly:quality', 3)).toBe('sonnet');
  });

  it('maps opsly:architect to sonnet routing', () => {
    expect(resolveRoutingPreference('opsly:architect', 2)).toBe('sonnet');
  });
});
