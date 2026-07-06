import { resolveWacrmForTenant } from '@intcloudsysops/wacrm-channel';

type Env = Record<string, string | undefined>;

export function resolveWacrmWebhookSecret(
  tenantSlug: string,
  env: Env = process.env as Env
): string | null {
  const cfg = resolveWacrmForTenant(tenantSlug, env);
  const tenantSecret = cfg?.webhookSecret?.trim();
  if (tenantSecret) {
    return tenantSecret;
  }

  const fallback =
    env.PESKIDS_WACRM_WEBHOOK_SECRET?.trim() ||
    env.WACRM_WEBHOOK_SECRET?.trim() ||
    env.WACRM_PESKIDS_WEBHOOK_SECRET?.trim();

  return fallback || null;
}

export function verifyWacrmWebhookSecret(
  provided: string | null | undefined,
  tenantSlug: string,
  env: Env = process.env as Env
): boolean {
  const expected = resolveWacrmWebhookSecret(tenantSlug, env);
  if (!expected) {
    return false;
  }
  const token = provided?.trim() ?? '';
  return token.length > 0 && token === expected;
}

export function extractWacrmWebhookSecretFromHeaders(
  headers: Headers
): string | null {
  const direct =
    headers.get('x-wacrm-webhook-secret') ||
    headers.get('x-webhook-secret') ||
    headers.get('x-peskids-webhook-secret');
  if (direct?.trim()) {
    return direct.trim();
  }

  const authorization = headers.get('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim() || null;
  }

  return null;
}
