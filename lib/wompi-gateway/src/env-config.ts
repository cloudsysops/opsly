export interface WompiTenantConfig {
  tenantSlug: string;
  enabled: boolean;
  privateKey: string;
  publicKey: string;
  eventsSecret: string;
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

/** Known tenant slug → Doppler prefix aliases (intcloudsysops uses INTCLOUDSYSOPS). */
function envPrefixForSlug(tenantSlug: string): string {
  if (tenantSlug === 'intcloudsysops') {
    return 'INTCLOUDSYSOPS';
  }
  return slugToEnvPrefix(tenantSlug);
}

/**
 * Resolves per-tenant Wompi (Colombia) credentials from Doppler-style env vars:
 * WOMPI_<TENANT>_ENABLED / _PRIVATE_KEY / _PUBLIC_KEY / _EVENTS_SECRET.
 *
 * Returns enabled: false (not null) when the flag is off — callers should
 * fall back to another provider (e.g. Stripe) rather than treat this as an
 * error, since Wompi is meant to run alongside other gateways, not replace them.
 */
export function resolveWompiForTenant(
  tenantSlug: string,
  env: Env = process.env as Env
): WompiTenantConfig | null {
  if (!SLUG_ENV.test(tenantSlug)) {
    return null;
  }
  const prefix = envPrefixForSlug(tenantSlug);
  const enabled = parseBooleanFlag(env[`WOMPI_${prefix}_ENABLED`], false);
  const privateKey = env[`WOMPI_${prefix}_PRIVATE_KEY`]?.trim() ?? '';
  const publicKey = env[`WOMPI_${prefix}_PUBLIC_KEY`]?.trim() ?? '';
  const eventsSecret = env[`WOMPI_${prefix}_EVENTS_SECRET`]?.trim() ?? '';

  if (!enabled) {
    return { tenantSlug, enabled: false, privateKey, publicKey, eventsSecret };
  }

  if (!privateKey || !eventsSecret) {
    return null;
  }

  return { tenantSlug, enabled: true, privateKey, publicKey, eventsSecret };
}

export function isWompiEnabledForTenant(
  tenantSlug: string,
  env: Env = process.env as Env
): boolean {
  const cfg = resolveWompiForTenant(tenantSlug, env);
  return cfg?.enabled === true && cfg.privateKey.length > 0;
}
