import { z } from 'zod';

export const SHIELD_ALERT_TYPES = [
  'phishing',
  'dominio_falso',
  'endpoint_caido',
  'abuse_api',
  'costo_anormal',
] as const;

export type ShieldAlertType = (typeof SHIELD_ALERT_TYPES)[number];

const tenantSlugRegex = /^[a-z0-9-]{3,30}$/;

export const shieldAlertConfigBodySchema = z.object({
  tenant_slug: z.string().regex(tenantSlugRegex),
  alert_type: z.enum(SHIELD_ALERT_TYPES),
  webhook_url: z.string().url().optional(),
  threshold: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])).optional(),
  enabled: z.boolean().optional().default(true),
});

export type ShieldAlertConfigBody = z.infer<typeof shieldAlertConfigBodySchema>;

const SHIELD_WEBHOOK_ENV_KEYS = [
  'SHIELD_ALERTS_DISCORD_WEBHOOK_URL',
  'DISCORD_WEBHOOK_SHIELD',
  'DISCORD_WEBHOOK_URL',
] as const;

function firstNonEmptyEnv(keys: readonly string[]): string | null {
  for (const key of keys) {
    const v = process.env[key]?.trim();
    if (v !== undefined && v.length > 0) {
      return v;
    }
  }
  return null;
}

/**
 * Resolves Discord webhook: explicit body URL, then Doppler env keys in order.
 */
export function resolveShieldDiscordWebhook(requested?: string): string | null {
  const trimmed = requested?.trim();
  if (trimmed !== undefined && trimmed.length > 0) {
    return trimmed;
  }
  return firstNonEmptyEnv(SHIELD_WEBHOOK_ENV_KEYS);
}
