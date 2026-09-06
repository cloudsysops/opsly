import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONSENT_CHANGED_EVENT,
  hasMarketingConsent,
  readCookieConsent,
  writeCookieConsent,
} from '@/lib/analytics/consent';

function stubLocalStorage(): Map<string, string> {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  });
  return store;
}

describe('cookie consent', () => {
  beforeEach(() => {
    stubLocalStorage();
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns null when nothing has been stored', () => {
    expect(readCookieConsent()).toBeNull();
    expect(hasMarketingConsent()).toBe(false);
  });

  it('persists the marketing choice and reads it back', () => {
    writeCookieConsent(true);
    const consent = readCookieConsent();
    expect(consent?.accepted).toBe(true);
    expect(consent?.marketing).toBe(true);
    expect(hasMarketingConsent()).toBe(true);
  });

  it('essential-only still marks accepted but not marketing', () => {
    writeCookieConsent(false);
    const consent = readCookieConsent();
    expect(consent?.accepted).toBe(true);
    expect(consent?.marketing).toBe(false);
    expect(hasMarketingConsent()).toBe(false);
  });

  it('dispatches the consent-changed event so a mounted pixel can react without a reload', () => {
    writeCookieConsent(true);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: CONSENT_CHANGED_EVENT })
    );
  });

  it('never throws when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    expect(readCookieConsent()).toBeNull();
    expect(() => writeCookieConsent(true)).not.toThrow();
  });
});
