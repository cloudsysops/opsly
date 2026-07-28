/**
 * Meta Cloud API webhook signature verification (X-Hub-Signature-256).
 * Reuses the same HMAC-SHA256 pattern as lib/openwa verify.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Verify Meta X-Hub-Signature-256: sha256=<hex> over raw body. */
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string
): Promise<boolean> {
  if (!appSecret) return false;
  if (!signatureHeader) return false;

  const normalized = signatureHeader.startsWith('sha256=')
    ? signatureHeader.slice('sha256='.length)
    : signatureHeader.includes('=')
      ? (signatureHeader.split('=')[1] ?? '')
      : signatureHeader;

  const expected = await hmacSha256Hex(appSecret, rawBody);
  return timingSafeEqual(expected, normalized);
}

export function readMetaSignatureHeader(headers: Headers): string | null {
  return headers.get('x-hub-signature-256');
}

/** Meta webhook subscription challenge (GET). */
export function resolveMetaVerifyChallenge(params: {
  mode: string | null;
  token: string | null;
  challenge: string | null;
  expectedToken: string;
}): { ok: true; challenge: string } | { ok: false; reason: string } {
  if (params.mode !== 'subscribe') {
    return { ok: false, reason: 'hub.mode must be subscribe' };
  }
  if (!params.expectedToken || params.token !== params.expectedToken) {
    return { ok: false, reason: 'verify token mismatch' };
  }
  if (!params.challenge) {
    return { ok: false, reason: 'missing hub.challenge' };
  }
  return { ok: true, challenge: params.challenge };
}
