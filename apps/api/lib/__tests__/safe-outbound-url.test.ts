import { describe, expect, it } from 'vitest';
import { assertSafeOutboundHttpsUrl } from '../safe-outbound-url';

describe('assertSafeOutboundHttpsUrl', () => {
  it('accepts public https URLs', () => {
    const result = assertSafeOutboundHttpsUrl('https://hooks.example.com/path');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.href).toBe('https://hooks.example.com/path');
    }
  });

  it('rejects http and private hosts', () => {
    expect(assertSafeOutboundHttpsUrl('http://example.com').ok).toBe(false);
    expect(assertSafeOutboundHttpsUrl('https://localhost/hook').ok).toBe(false);
    expect(assertSafeOutboundHttpsUrl('https://127.0.0.1/hook').ok).toBe(false);
    expect(assertSafeOutboundHttpsUrl('https://10.0.0.5/hook').ok).toBe(false);
    expect(assertSafeOutboundHttpsUrl('https://192.168.1.1/hook').ok).toBe(false);
    expect(assertSafeOutboundHttpsUrl('https://169.254.169.254/latest').ok).toBe(false);
    expect(assertSafeOutboundHttpsUrl('https://user:pass@example.com').ok).toBe(false);
  });
});
