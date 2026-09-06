import { createHash } from 'node:crypto';

/**
 * Server-side half of the Meta Pixel/CAPI pair (see components/analytics/meta-pixel.tsx
 * for the browser half). Sending the same conversion from both sides — with a shared
 * `eventId` so Meta deduplicates — means the event still reaches Meta even when the
 * browser pixel is blocked by an ad blocker or iOS tracking protection.
 *
 * Inert (returns without a network call) until NEXT_PUBLIC_META_PIXEL_ID and
 * META_CONVERSIONS_ACCESS_TOKEN are both set. Never throws: a Meta API hiccup must
 * never fail a lead submission.
 */

const GRAPH_API_VERSION = 'v21.0';

function hashPii(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/** Meta expects E.164 digits only (no `+`), hashed the same as any other PII field. */
function hashPhone(value: string): string {
  return hashPii(value.replace(/[^0-9]/g, ''));
}

export type MetaLeadEventInput = {
  eventId: string;
  email: string;
  phone: string;
  sourceUrl: string;
  clientIp: string | null;
  userAgent: string | null;
  /** Meta's `fbc`/`fbp` browser cookies, forwarded from the request when present. */
  fbc?: string | null;
  fbp?: string | null;
};

export async function sendMetaLeadCapiEvent(input: MetaLeadEventInput): Promise<void> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
  const accessToken = process.env.META_CONVERSIONS_ACCESS_TOKEN?.trim();
  if (!pixelId || !accessToken) return;

  const testEventCode = process.env.META_CONVERSIONS_TEST_EVENT_CODE?.trim();

  const payload = {
    data: [
      {
        event_name: 'Lead',
        event_time: Math.floor(Date.now() / 1000),
        event_id: input.eventId,
        event_source_url: input.sourceUrl,
        action_source: 'website',
        user_data: {
          em: [hashPii(input.email)],
          ph: [hashPhone(input.phone)],
          client_ip_address: input.clientIp ?? undefined,
          client_user_agent: input.userAgent ?? undefined,
          fbc: input.fbc ?? undefined,
          fbp: input.fbp ?? undefined,
        },
      },
    ],
    ...(testEventCode ? { test_event_code: testEventCode } : {}),
  };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      // Never log the access token or the payload (it carries hashed PII, but no
      // reason to put it in logs either); the status code is enough to alert on.
      console.error(
        JSON.stringify({
          component: 'peskids.analytics',
          event: 'meta_capi_failed',
          status: response.status,
          request_event_id: input.eventId,
        })
      );
    }
  } catch (error) {
    console.error(
      JSON.stringify({
        component: 'peskids.analytics',
        event: 'meta_capi_error',
        error: error instanceof Error ? error.message : 'unknown',
        request_event_id: input.eventId,
      })
    );
  }
}
