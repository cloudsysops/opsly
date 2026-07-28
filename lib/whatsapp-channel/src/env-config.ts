import type { MetaCloudEnvConfig, WhatsAppLifecycleState } from './types.js';

type Env = Record<string, string | undefined>;

function flag(value: string | undefined, defaultWhenUnset = false): boolean {
  if (value === undefined || value.trim() === '') return defaultWhenUnset;
  const n = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(n)) return true;
  if (['0', 'false', 'no', 'off'].includes(n)) return false;
  return defaultWhenUnset;
}

function pick(env: Env, keys: string[]): string {
  for (const k of keys) {
    const v = env[k]?.trim();
    if (v) return v;
  }
  return '';
}

/**
 * Resolve Meta Cloud config for a tenant.
 * Never returns secrets into logs; callers must treat tokens as sensitive.
 * Flags default OFF — sandbox-first.
 */
export function resolveMetaCloudForTenant(
  tenantSlug: string,
  env: Env = process.env as Env
): MetaCloudEnvConfig {
  const prefix = tenantSlug.replace(/-/g, '_').toUpperCase();
  const enabled = flag(env.PESKIDS_WHATSAPP_ENABLED) || flag(env[`WHATSAPP_${prefix}_ENABLED`]);
  const inboundEnabled =
    flag(env.PESKIDS_WHATSAPP_INBOUND_META) || flag(env[`WHATSAPP_${prefix}_INBOUND_META`]);
  const outboundEnabled =
    flag(env.PESKIDS_WHATSAPP_OUTBOUND_ENABLED) ||
    flag(env[`WHATSAPP_${prefix}_OUTBOUND_ENABLED`]);

  const verifyToken = pick(env, [
    'META_WHATSAPP_VERIFY_TOKEN',
    `META_WHATSAPP_${prefix}_VERIFY_TOKEN`,
  ]);
  const appSecret = pick(env, [
    'META_WHATSAPP_APP_SECRET',
    `META_WHATSAPP_${prefix}_APP_SECRET`,
  ]);
  const accessToken = pick(env, [
    'META_WHATSAPP_ACCESS_TOKEN',
    `META_WHATSAPP_${prefix}_ACCESS_TOKEN`,
  ]);
  const phoneNumberId = pick(env, [
    'META_WHATSAPP_PHONE_NUMBER_ID',
    `META_WHATSAPP_${prefix}_PHONE_NUMBER_ID`,
  ]);
  const wabaId = pick(env, ['META_WHATSAPP_WABA_ID', `META_WHATSAPP_${prefix}_WABA_ID`]);
  const apiVersion =
    pick(env, ['META_API_VERSION', `META_${prefix}_API_VERSION`]) || 'v21.0';

  const hasCredentials = Boolean(appSecret && verifyToken && phoneNumberId);
  const hasSendCreds = Boolean(accessToken && phoneNumberId);

  let lifecycle: WhatsAppLifecycleState = 'stub';
  if (hasCredentials || hasSendCreds) {
    lifecycle = 'configured';
  }
  // ready/enabled are operational states set by health after sandbox verification;
  // env alone never implies enabled.
  if (enabled && inboundEnabled && hasCredentials) {
    lifecycle = 'ready';
  }
  if (enabled && inboundEnabled && outboundEnabled && hasCredentials && hasSendCreds) {
    // Still not auto-enabled for send without human go/no-go — keep as ready
    // unless an explicit OPSLY_WHATSAPP_FORCE_ENABLED=true (forbidden in prod docs).
    lifecycle = flag(env.OPSLY_WHATSAPP_FORCE_ENABLED) ? 'enabled' : 'ready';
  }

  return {
    tenantSlug,
    enabled,
    inboundEnabled,
    outboundEnabled,
    verifyToken,
    appSecret,
    accessToken,
    phoneNumberId,
    wabaId,
    apiVersion,
    lifecycle,
  };
}

export function isMetaInboundAccepting(cfg: MetaCloudEnvConfig): boolean {
  return cfg.enabled && cfg.inboundEnabled && cfg.appSecret.length > 0;
}

export function isMetaOutboundAllowed(cfg: MetaCloudEnvConfig): boolean {
  return (
    cfg.enabled &&
    cfg.outboundEnabled &&
    cfg.accessToken.length > 0 &&
    cfg.phoneNumberId.length > 0
  );
}
