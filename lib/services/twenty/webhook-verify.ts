import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies a Twenty CRM webhook delivery and returns the parsed payload if
 * valid. Algorithm per Twenty's docs: HMAC-SHA256 of
 * `${timestamp}:${rawBody}` using the webhook's secret, compared against the
 * X-Twenty-Webhook-Signature header; the timestamp comes from
 * X-Twenty-Webhook-Timestamp. NEEDS LIVE VERIFICATION against a real Twenty
 * instance — cross-referenced from Twenty's public docs/community sources,
 * not confirmed against a live webhook delivery from here.
 *
 * Also enforces a timestamp tolerance window (replay protection) — Twenty's
 * docs don't specify one, so this is a defensive addition, not a documented
 * Twenty behavior.
 */

export type TwentyWebhookVerification<T = unknown> =
  | { ok: true; payload: T }
  | { ok: false; reason: string };

const DEFAULT_TOLERANCE_SECONDS = 300;

export function verifyTwentyWebhookSignature<T = unknown>(
  rawBody: string,
  timestampHeader: string | null | undefined,
  signatureHeader: string | null | undefined,
  secret: string,
  options: { toleranceSeconds?: number; now?: () => number } = {}
): TwentyWebhookVerification<T> {
  if (!secret) {
    return { ok: false, reason: 'no webhook secret configured' };
  }
  if (!timestampHeader) {
    return { ok: false, reason: 'missing X-Twenty-Webhook-Timestamp header' };
  }
  if (!signatureHeader) {
    return { ok: false, reason: 'missing X-Twenty-Webhook-Signature header' };
  }

  const timestampHeaderTrimmed = timestampHeader.trim();
  const timestampRaw = Number(timestampHeaderTrimmed);
  if (!Number.isFinite(timestampRaw)) {
    return { ok: false, reason: 'invalid timestamp header' };
  }
  // Twenty's timestamp units aren't documented; accept either UNIX seconds or
  // milliseconds by magnitude — 1e12 is ~2001 in ms, so anything below that
  // can only be a seconds-based timestamp for any realistic delivery time.
  const timestampMs = timestampRaw < 1e12 ? timestampRaw * 1000 : timestampRaw;

  const toleranceSeconds = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  const now = (options.now ?? Date.now)();
  const ageSeconds = Math.abs(now - timestampMs) / 1000;
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, reason: `timestamp outside tolerance window (${Math.round(ageSeconds)}s)` };
  }

  const expected = createHmac('sha256', secret)
    .update(`${timestampHeaderTrimmed}:${rawBody}`)
    .digest('hex');

  let isValid: boolean;
  try {
    isValid = timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(signatureHeader.toLowerCase(), 'hex')
    );
  } catch {
    return { ok: false, reason: 'malformed signature header' };
  }

  if (!isValid) {
    return { ok: false, reason: 'signature mismatch' };
  }

  try {
    return { ok: true, payload: JSON.parse(rawBody) as T };
  } catch {
    return { ok: false, reason: 'body is not valid JSON' };
  }
}
