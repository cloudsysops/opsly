import type { OpenWAConfig } from './types.js';

type Env = Record<string, string | undefined>;

const SLUG_ENV = /^[a-z0-9-]+$/;

function slugToEnvPrefix(slug: string): string {
  return slug.replace(/-/g, '_').toUpperCase();
}

/** Ensure apiUrl ends with /api (OpenWA REST prefix) */
export function normalizeApiUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export function getConfig(env?: Env): OpenWAConfig | null {
  const e: Env = env ?? (process.env as Env);
  const apiUrlRaw = e['OPENWA_API_URL']?.trim();
  const apiKey = e['OPENWA_API_KEY']?.trim();
  const sessionId = e['OPENWA_SESSION_ID']?.trim() ?? 'default';
  if (!apiUrlRaw || !apiKey) return null;
  return { apiUrl: normalizeApiUrl(apiUrlRaw), apiKey, sessionId };
}

/**
 * Per-tenant config from env (Doppler / compose).
 * Precedence: OPENWA_{SLUG}_* → global OPENWA_*.
 */
export function getConfigForTenant(tenantSlug: string, env?: Env): OpenWAConfig | null {
  if (!SLUG_ENV.test(tenantSlug)) return null;
  const e: Env = env ?? (process.env as Env);
  const prefix = slugToEnvPrefix(tenantSlug);
  const apiUrlRaw = e[`OPENWA_${prefix}_API_URL`]?.trim() ?? e['OPENWA_API_URL']?.trim();
  const apiKey = e[`OPENWA_${prefix}_API_KEY`]?.trim() ?? e['OPENWA_API_KEY']?.trim();
  const sessionId =
    e[`OPENWA_${prefix}_SESSION_ID`]?.trim() ??
    e['OPENWA_SESSION_ID']?.trim() ??
    tenantSlug;
  if (!apiUrlRaw || !apiKey) return null;
  return { apiUrl: normalizeApiUrl(apiUrlRaw), apiKey, sessionId };
}

export function getWebhookSecret(tenantSlug?: string, env?: Env): string | undefined {
  const e: Env = env ?? (process.env as Env);
  if (tenantSlug && SLUG_ENV.test(tenantSlug)) {
    const prefix = slugToEnvPrefix(tenantSlug);
    const scoped = e[`OPENWA_${prefix}_WEBHOOK_SECRET`]?.trim();
    if (scoped) return scoped;
  }
  return e['OPENWA_WEBHOOK_SECRET']?.trim();
}

export function isOpenWAEnabled(env?: Env): boolean {
  return getConfig(env) !== null;
}

export function isOpenWAEnabledForTenant(tenantSlug: string, env?: Env): boolean {
  return getConfigForTenant(tenantSlug, env) !== null;
}
