'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { CONSENT_CHANGED_EVENT, hasMarketingConsent } from '@/lib/analytics/consent';

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Meta Pixel (browser half of the Pixel/CAPI pair — see
 * lib/analytics/meta-conversions.ts for the server half). Renders nothing,
 * and the script never loads, unless BOTH:
 *
 *   1. NEXT_PUBLIC_META_PIXEL_ID is configured, and
 *   2. the visitor accepted marketing cookies in the cookie banner.
 *
 * Re-checks on the `pk-consent-changed` event so accepting mid-session loads
 * the pixel without a page reload.
 */
export function MetaPixel(): React.ReactElement | null {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!PIXEL_ID) return;
    setAllowed(hasMarketingConsent());

    const onConsentChanged = (): void => setAllowed(hasMarketingConsent());
    window.addEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
    return () => window.removeEventListener(CONSENT_CHANGED_EVENT, onConsentChanged);
  }, []);

  if (!PIXEL_ID || !allowed) return null;

  return (
    <Script id="meta-pixel" strategy="afterInteractive">
      {`
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${PIXEL_ID}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}

/**
 * Fires the client-side half of a Lead conversion. `eventId` must be the same
 * value sent server-side via sendMetaLeadCapiEvent (the API response's
 * `meta_event_id`) so Meta deduplicates the pixel and CAPI events instead of
 * double-counting the conversion.
 */
export function trackMetaLead(eventId: string): void {
  if (!PIXEL_ID || typeof window === 'undefined' || !window.fbq || !hasMarketingConsent()) return;
  window.fbq('track', 'Lead', {}, { eventID: eventId });
}
