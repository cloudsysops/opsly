import { describe, expect, it, vi, afterEach } from 'vitest';
import { isNativeApp } from '@/lib/native-push';

describe('isNativeApp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when Capacitor is missing', () => {
    vi.stubGlobal('window', {});
    expect(isNativeApp()).toBe(false);
  });

  it('returns true when Capacitor reports native platform', () => {
    vi.stubGlobal('window', {
      Capacitor: { isNativePlatform: () => true },
    });
    expect(isNativeApp()).toBe(true);
  });

  it('returns false when Capacitor reports web', () => {
    vi.stubGlobal('window', {
      Capacitor: { isNativePlatform: () => false },
    });
    expect(isNativeApp()).toBe(false);
  });
});
