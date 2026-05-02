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

/**
 * Resolves Discord webhook: explicit body URL, then SHIELD_ALERTS_DISCORD_WEBHOOK_URL, then DISCORD_WEBHOOK_URL.
 */
export function resolveShieldDiscordWebhook(requested?: string): string | null {
  const trimmed = requested?.trim();
  if (trimmed !== undefined && trimmed.length > 0) {
    return trimmed;
  }
  const fromEnv =
    process.env.SHIELD_ALERTS_DISCORD_WEBHOOK_URL?.trim() ||
    process.env.DISCORD_WEBHOOK_URL?.trim();
  return fromEnv !== undefined && fromEnv.length > 0 ? fromEnv : null;
}
