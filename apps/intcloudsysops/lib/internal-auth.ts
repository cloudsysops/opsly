import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Shared secret for n8n / in-process callers hitting Peskids internal HTTP routes.
 * Prefer PESKIDS_INTERNAL_SECRET; keep inbound/Jelou aliases so Doppler does not need a new key.
 */
export function resolvePeskidsInternalSecret(): string | undefined {
  const candidates = [
    process.env.PESKIDS_INTERNAL_SECRET,
    process.env.PESKIDS_INTERNAL_API_SECRET,
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET,
    process.env.JELOU_WEBHOOK_SECRET,
  ];

  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return undefined;
}

function secretsEqual(provided: string, expected: string): boolean {
  const actual = Buffer.from(provided);
  const want = Buffer.from(expected);
  if (actual.length !== want.length) {
    return false;
  }

  try {
    return timingSafeEqual(actual, want);
  } catch {
    return false;
  }
}

/** Fail-closed: missing secret or missing/mismatched header → unauthorized. */
export function verifyPeskidsInternalRequest(req: NextRequest): boolean {
  const secret = resolvePeskidsInternalSecret();
  if (!secret) {
    return false;
  }

  const header =
    req.headers.get('x-internal-secret') || req.headers.get('x-webhook-secret') || '';
  return secretsEqual(header, secret);
}
