/**
 * Zod schemas for WhatsApp config shapes and DTOs.
 * Pure parse helpers — no process.env singleton, no startup side effects.
 */

import { z } from 'zod';

import { DEFAULT_WHATSAPP_PROVIDER } from './types.js';

const boolFromEnv = z
  .union([z.boolean(), z.string()])
  .transform((v) => {
    if (typeof v === 'boolean') {
      return v;
    }
    return v === 'true' || v === '1';
  });

export const metaEnvSchema = z.object({
  META_APP_ID: z.string().optional().default(''),
  META_APP_SECRET: z.string().optional().default(''),
  META_VERIFY_TOKEN: z.string().optional().default(''),
  META_ACCESS_TOKEN: z.string().optional().default(''),
  META_WABA_ID: z.string().optional().default(''),
  META_PHONE_NUMBER_ID: z.string().optional().default(''),
  META_API_VERSION: z.string().optional().default('v21.0'),
  META_WEBHOOK_ENABLED: boolFromEnv.default(false),
});

export const wacrmEnvSchema = z.object({
  WACRM_BASE_URL: z.string().optional().default(''),
  WACRM_API_KEY: z.string().optional().default(''),
  WACRM_WEBHOOK_SECRET: z.string().optional().default(''),
  WACRM_ENABLED: boolFromEnv.default(false),
});

/** Tenant-agnostic WhatsApp feature flags (no hard-coded tenant slug). */
export const whatsappFeatureEnvSchema = z.object({
  WHATSAPP_ENABLED: boolFromEnv.default(false),
  WHATSAPP_PROVIDER: z
    .enum(['meta', 'wacrm', 'openwa'])
    .default(DEFAULT_WHATSAPP_PROVIDER),
  WHATSAPP_APPROVAL_REQUIRED: boolFromEnv.default(true),
  WHATSAPP_SANDBOX: boolFromEnv.default(true),
});

export const whatsappEnvSchema = metaEnvSchema
  .merge(wacrmEnvSchema)
  .merge(whatsappFeatureEnvSchema);

export type WhatsAppEnvConfig = z.infer<typeof whatsappEnvSchema>;

export function parseWhatsAppEnv(
  env: Record<string, string | undefined>
): WhatsAppEnvConfig {
  return whatsappEnvSchema.parse(env);
}

export function safeParseWhatsAppEnv(env: Record<string, string | undefined>) {
  return whatsappEnvSchema.safeParse(env);
}

export const sendTextDtoSchema = z.object({
  tenantId: z.string().min(1),
  contactPhone: z.string().min(5),
  body: z.string().min(1),
  metadata: z.record(z.unknown()).optional(),
});

export type SendTextDto = z.infer<typeof sendTextDtoSchema>;

export const metaChallengeQuerySchema = z.object({
  'hub.mode': z.literal('subscribe'),
  'hub.verify_token': z.string().min(1),
  'hub.challenge': z.string().min(1),
});

export type MetaChallengeQuery = z.infer<typeof metaChallengeQuerySchema>;
