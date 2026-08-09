/**
 * Valida URLs de salida (webhooks) para reducir SSRF hacia redes privadas / metadata.
 * Solo permite https con host público.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  'metadata.google.internal',
  'metadata',
]);

function isPrivateOrLocalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTS.has(host) || host.endsWith('.localhost') || host.endsWith('.local')) {
    return true;
  }

  // IPv4 literals
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (ipv4) {
    const octets = ipv4.slice(1).map((part) => Number.parseInt(part, 10));
    if (octets.some((n) => Number.isNaN(n) || n > 255)) {
      return true;
    }
    const [a, b] = octets;
    if (a === 10 || a === 127 || a === 0) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    return false;
  }

  // IPv6 literals (coarse block of loopback / ULA / link-local)
  if (host.includes(':')) {
    if (
      host === '::1' ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('fe80')
    ) {
      return true;
    }
  }

  return false;
}

export type SafeOutboundUrlResult =
  | { ok: true; href: string }
  | { ok: false; error: string };

/**
 * Solo `https:` y hosts no privados. Rechaza userinfo embebido.
 */
export function assertSafeOutboundHttpsUrl(raw: string): SafeOutboundUrlResult {
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed.length > 2048) {
    return { ok: false, error: 'Invalid webhook URL' };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, error: 'Invalid webhook URL' };
  }

  if (url.protocol !== 'https:') {
    return { ok: false, error: 'Only https webhook URLs are allowed' };
  }

  if (url.username || url.password) {
    return { ok: false, error: 'Webhook URL must not include credentials' };
  }

  if (isPrivateOrLocalHostname(url.hostname)) {
    return { ok: false, error: 'Private or local webhook hosts are not allowed' };
  }

  return { ok: true, href: url.href };
}
