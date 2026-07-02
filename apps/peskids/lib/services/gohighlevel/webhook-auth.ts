/** LEGACY (GHL webhook): HMAC verification for inbound GHL events. */
import crypto from 'crypto';

export function verifyGhlWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch {
    return false;
  }
}

export function extractGhlEventType(body: Record<string, unknown>): string | null {
  const eventType =
    typeof body.event_type === 'string'
      ? body.event_type
      : typeof body.type === 'string'
        ? body.type
        : typeof body.event === 'string'
          ? body.event
          : null;

  if (!eventType) return null;

  const knownPrefixes = ['opportunity.', 'contact.', 'pipeline.', 'form.'];
  const hasKnownPrefix = knownPrefixes.some((p) => eventType.startsWith(p));

  if (hasKnownPrefix) return eventType;

  const normalized = eventType.toLowerCase().replace(/\s+/g, '.');
  if (knownPrefixes.some((p) => normalized.startsWith(p))) return normalized;

  return eventType;
}
