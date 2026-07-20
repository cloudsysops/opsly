/**
 * Pure cryptographic helpers for WhatsApp webhook verification.
 * No network. Accepts raw body string (preferred) or JSON-stable object for tests.
 */

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

function toBytes(input: string): Buffer {
  return Buffer.from(input, 'utf8');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length === 0 || bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

/** SHA-256 hex digest of a UTF-8 string (idempotency keys). */
export function hashSha256Hex(value: string): string {
  return createHash('sha256').update(toBytes(value)).digest('hex');
}

/** Deterministic hash of a JSON-serializable payload. */
export function hashPayload(payload: Record<string, unknown>): string {
  return hashSha256Hex(JSON.stringify(payload));
}

/**
 * Meta Cloud API: `X-Hub-Signature-256: sha256=<hex>`
 * Compare HMAC-SHA256(appSecret, rawBody).
 */
export function verifyMetaHubSignature256(
  appSecret: string,
  rawBody: string,
  signatureHeader: string
): boolean {
  if (!appSecret || !signatureHeader) {
    return false;
  }

  const [algorithm, expectedHash] = signatureHeader.split('=');
  if (algorithm !== 'sha256' || !expectedHash) {
    return false;
  }

  const calculated = createHmac('sha256', appSecret).update(toBytes(rawBody)).digest('hex');
  return safeEqualHex(calculated, expectedHash);
}

/**
 * Generic HMAC-SHA256 hex signature (WACRM-style adapters).
 */
export function verifyHmacSha256Hex(
  secret: string,
  rawBody: string,
  signatureHex: string
): boolean {
  if (!secret || !signatureHex) {
    return false;
  }
  const calculated = createHmac('sha256', secret).update(toBytes(rawBody)).digest('hex');
  return safeEqualHex(calculated, signatureHex.toLowerCase());
}

/** Build Meta signature header value for fixtures. */
export function buildMetaHubSignature256Header(appSecret: string, rawBody: string): string {
  const hash = createHmac('sha256', appSecret).update(toBytes(rawBody)).digest('hex');
  return `sha256=${hash}`;
}
