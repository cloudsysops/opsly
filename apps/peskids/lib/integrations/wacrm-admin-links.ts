import { resolveWacrmForTenant } from '@intcloudsysops/wacrm-channel';

type Env = Record<string, string | undefined>;

function tenantSlug(env: Env = process.env as Env): string {
  return (env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

export function resolveWacrmServerUrl(env: Env = process.env as Env): string | null {
  const publicUrl = env.NEXT_PUBLIC_WACRM_PESKIDS_SERVER_URL?.trim();
  if (publicUrl) {
    return publicUrl.replace(/\/$/, '');
  }

  const cfg = resolveWacrmForTenant(tenantSlug(env), env);
  const serverUrl = cfg?.serverUrl?.trim();
  return serverUrl ? serverUrl.replace(/\/$/, '') : null;
}

export function buildWacrmConversationUrl(
  externalConversationId?: string | null,
  env: Env = process.env as Env
): string | null {
  const base = resolveWacrmServerUrl(env);
  if (!base) {
    return null;
  }
  if (!externalConversationId?.trim()) {
    return base;
  }
  const id = encodeURIComponent(externalConversationId.trim());
  return `${base}/conversations/${id}`;
}

export function buildWhatsAppDeepLink(phone: string): string | null {
  const digits = phone.replace(/\D+/g, '');
  if (!digits) {
    return null;
  }
  return `https://wa.me/${digits}`;
}
