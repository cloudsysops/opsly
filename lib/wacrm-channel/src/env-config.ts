export type WacrmTwentySyncMode = 'none' | 'notes-only' | 'person-link';

export interface WacrmTenantConfig {
  tenantSlug: string;
  enabled: boolean;
  serverUrl: string;
  webhookSecret: string;
  syncTwenty: WacrmTwentySyncMode;
}

type Env = Record<string, string | undefined>;

const SLUG_ENV = /^[a-z0-9-]+$/;

function slugToEnvPrefix(slug: string): string {
  return slug.replace(/-/g, '_').toUpperCase();
}

function parseBooleanFlag(value: string | undefined, defaultWhenUnset: boolean): boolean {
  if (value === undefined || value.trim() === '') {
    return defaultWhenUnset;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }
  return defaultWhenUnset;
}

function parseSyncMode(value: string | undefined): WacrmTwentySyncMode {
  const v = value?.trim().toLowerCase();
  if (v === 'none' || v === 'notes-only' || v === 'person-link') {
    return v;
  }
  return 'notes-only';
}

/** Known tenant slug → Doppler prefix aliases (intcloudsysops uses INTCLOUDSYSOPS). */
function envPrefixForSlug(tenantSlug: string): string {
  if (tenantSlug === 'intcloudsysops') {
    return 'INTCLOUDSYSOPS';
  }
  return slugToEnvPrefix(tenantSlug);
}

export function resolveWacrmForTenant(
  tenantSlug: string,
  env: Env = process.env as Env
): WacrmTenantConfig | null {
  if (!SLUG_ENV.test(tenantSlug)) {
    return null;
  }
  const prefix = envPrefixForSlug(tenantSlug);
  const enabled = parseBooleanFlag(env[`WACRM_${prefix}_ENABLED`], false);
  const serverUrl = (env[`WACRM_${prefix}_SERVER_URL`]?.trim() ?? '').replace(/\/$/, '');
  const webhookSecret = env[`WACRM_${prefix}_WEBHOOK_SECRET`]?.trim() ?? '';
  const syncTwenty = parseSyncMode(env[`WACRM_${prefix}_SYNC_TWENTY`]);

  if (!enabled) {
    return {
      tenantSlug,
      enabled: false,
      serverUrl,
      webhookSecret,
      syncTwenty,
    };
  }

  if (!serverUrl) {
    return null;
  }

  return {
    tenantSlug,
    enabled: true,
    serverUrl,
    webhookSecret,
    syncTwenty,
  };
}

export function isWacrmEnabledForTenant(
  tenantSlug: string,
  env: Env = process.env as Env
): boolean {
  const cfg = resolveWacrmForTenant(tenantSlug, env);
  return cfg?.enabled === true && cfg.serverUrl.length > 0;
}
