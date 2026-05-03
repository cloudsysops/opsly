import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  LS_WEBHOOK_SHA256_PREFIX,
  LS_WEBHOOK_SHA256_PREFIX_LEN,
} from './local-services-webhook-constants';

const SHA256_HEX_LEN = 64;

function extractSignatureHex(header: string): string {
  const lower = header.toLowerCase();
  if (lower.startsWith(LS_WEBHOOK_SHA256_PREFIX)) {
    return header.slice(LS_WEBHOOK_SHA256_PREFIX_LEN).trim();
  }
  return header.trim();
}

function isValidSha256Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value);
}

function hmacSha256Hex(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
}

function timingSafeHexEqual(expectedHex: string, receivedHex: string): boolean {
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const receivedBuf = Buffer.from(receivedHex.toLowerCase(), 'hex');
  if (expectedBuf.length !== receivedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, receivedBuf);
}

/**
 * Verifies `X-Opsly-Signature` (or `x-opsly-signature`) as hex HMAC-SHA256 of the raw body.
 * Accepts `sha256=<hex>` or raw lowercase hex (64 chars).
 */
export function verifyLocalServicesWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null | undefined;
  secret: string;
}): boolean {
  if (params.secret.length === 0) {
    return false;
  }
  const header = params.signatureHeader?.trim();
  if (header === undefined || header === null || header === '') {
    return false;
  }
  const hexPart = extractSignatureHex(header);
  if (hexPart === '' || !isValidSha256Hex(hexPart)) {
    return false;
  }
  const expectedHex = hmacSha256Hex(params.secret, params.rawBody);
  if (expectedHex.length !== SHA256_HEX_LEN || hexPart.length !== SHA256_HEX_LEN) {
    return false;
  }
  return timingSafeHexEqual(expectedHex, hexPart);
}

export function localServicesWebhookSecretEnvKeyForSlug(slug: string): string {
  const normalized = slug.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  return `LOCAL_SERVICES_WEBHOOK_SECRET_${normalized}`;
}

/**
 * Per-tenant secret from env, or shared `LOCAL_SERVICES_WEBHOOK_SECRET` (e.g. local dev).
 */
export function resolveLocalServicesWebhookSecret(slug: string): string {
  const perTenant = process.env[localServicesWebhookSecretEnvKeyForSlug(slug)];
  if (typeof perTenant === 'string' && perTenant.trim() !== '') {
    return perTenant.trim();
  }
  const fallback = process.env.LOCAL_SERVICES_WEBHOOK_SECRET;
  if (typeof fallback === 'string' && fallback.trim() !== '') {
    return fallback.trim();
  }
  return '';
}
