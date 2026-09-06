import { describe, expect, it } from 'vitest';
import { safeCallbackUrl } from '../safe-callback-url';

describe('safeCallbackUrl', () => {
  it('allows only same-origin relative paths', () => {
    expect(safeCallbackUrl('/franchise/units')).toBe('/franchise/units');
    expect(safeCallbackUrl('https://evil.example')).toBe('/admin');
    expect(safeCallbackUrl('//evil.example')).toBe('/admin');
  });
});
