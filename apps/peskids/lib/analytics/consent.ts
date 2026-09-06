/**
 * Shared consent state for `components/legal/cookie-banner.tsx` and
 * `components/analytics/meta-pixel.tsx`. One localStorage key, one shape,
 * read/written from both places instead of each guessing the other's format.
 */

const STORAGE_KEY = 'pk-cookie-consent';
export const CONSENT_CHANGED_EVENT = 'pk-consent-changed';

export type PeskidsCookieConsent = {
  /** Always true once the banner has been dismissed either way. */
  accepted: boolean;
  /** Opts into marketing/analytics cookies (Meta Pixel). Independent of `accepted`. */
  marketing: boolean;
  at: number;
};

export function readCookieConsent(): PeskidsCookieConsent | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PeskidsCookieConsent>;
    return {
      accepted: parsed.accepted === true,
      marketing: parsed.marketing === true,
      at: typeof parsed.at === 'number' ? parsed.at : Date.now(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(marketing: boolean): void {
  const value: PeskidsCookieConsent = { accepted: true, marketing, at: Date.now() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Private browsing or storage blocked — nothing to persist, but don't crash the banner.
  }
  try {
    window.dispatchEvent(new CustomEvent(CONSENT_CHANGED_EVENT, { detail: value }));
  } catch {
    // ignore
  }
}

export function hasMarketingConsent(): boolean {
  return readCookieConsent()?.marketing === true;
}
