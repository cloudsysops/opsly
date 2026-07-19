/**
 * WhatsApp + WACRM Environment Configuration
 * Validates and provides typed access to all WhatsApp-related env vars
 * Supports multi-tenant, sandbox mode, and provider switching
 */

import { z } from 'zod';

const metaEnvSchema = z.object({
  META_APP_ID: z.string().min(1, 'META_APP_ID required').optional().default(''),
  META_APP_SECRET: z.string().min(1, 'META_APP_SECRET required').optional().default(''),
  META_VERIFY_TOKEN: z.string().min(1, 'META_VERIFY_TOKEN required').optional().default(''),
  META_ACCESS_TOKEN: z.string().min(1, 'META_ACCESS_TOKEN required').optional().default(''),
  META_WABA_ID: z.string().min(1, 'META_WABA_ID required').optional().default(''),
  META_PHONE_NUMBER_ID: z.string().min(1, 'META_PHONE_NUMBER_ID required').optional().default(''),
  META_API_VERSION: z.string().min(1, 'META_API_VERSION required').optional().default('v21.0'),
  META_WEBHOOK_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
});

const wacrmEnvSchema = z.object({
  WACRM_BASE_URL: z.string().url('WACRM_BASE_URL must be valid URL').optional().default(''),
  WACRM_API_KEY: z.string().min(1, 'WACRM_API_KEY required').optional().default(''),
  WACRM_WEBHOOK_SECRET: z.string().min(1, 'WACRM_WEBHOOK_SECRET required').optional().default(''),
  WACRM_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
});

const peskidsWhatsAppEnvSchema = z.object({
  PESKIDS_WHATSAPP_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('false'),
  PESKIDS_WHATSAPP_PROVIDER: z.enum(['wacrm', 'meta', 'openwa']).default('wacrm'),
  PESKIDS_WHATSAPP_APPROVAL_REQUIRED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('true'),
  PESKIDS_WHATSAPP_SANDBOX: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('true'),
  N8N_PESKIDS_WEBHOOK_URL: z.string().url().optional().default(''),
  N8N_PESKIDS_WEBHOOK_SECRET: z.string().optional().default(''),
});

const sharedSchema = z.object({
  TWENTY_ENABLED: z
    .string()
    .transform((v) => v === 'true' || v === '1')
    .default('true'),
  TWENTY_API_URL: z.string().url().optional().default(''),
  TWENTY_API_KEY: z.string().optional().default(''),
  SUPABASE_URL: z.string().url().optional().default(''),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(''),
});

const fullSchema = metaEnvSchema.merge(wacrmEnvSchema).merge(peskidsWhatsAppEnvSchema).merge(sharedSchema);

export type WhatsAppEnvConfig = z.infer<typeof fullSchema>;

class WhatsAppConfigManager {
  private config: WhatsAppEnvConfig;

  constructor() {
    this.config = this.validate(process.env);
  }

  private validate(env: Record<string, string | undefined>): WhatsAppEnvConfig {
    const result = fullSchema.safeParse(env);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errors)
        .map(([field, msgs]) => `${field}: ${msgs?.join(', ')}`)
        .join('\n');

      // Don't fail startup if WhatsApp is disabled
      if (env.PESKIDS_WHATSAPP_ENABLED !== 'true' && env.META_WEBHOOK_ENABLED !== 'true' && env.WACRM_ENABLED !== 'true') {
        console.warn('[WhatsApp Config] Optional WhatsApp vars missing (WhatsApp disabled):\n', errorMessages);
        return result.error.parse({
          ...env,
          META_WEBHOOK_ENABLED: 'false',
          WACRM_ENABLED: 'false',
          PESKIDS_WHATSAPP_ENABLED: 'false',
        }) as WhatsAppEnvConfig;
      }

      throw new Error(`[WhatsApp Config] Validation failed:\n${errorMessages}`);
    }

    return result.data;
  }

  getMetaConfig() {
    return {
      appId: this.config.META_APP_ID,
      appSecret: this.config.META_APP_SECRET,
      verifyToken: this.config.META_VERIFY_TOKEN,
      accessToken: this.config.META_ACCESS_TOKEN,
      wabaId: this.config.META_WABA_ID,
      phoneNumberId: this.config.META_PHONE_NUMBER_ID,
      apiVersion: this.config.META_API_VERSION,
      enabled: this.config.META_WEBHOOK_ENABLED,
    };
  }

  getWacrmConfig() {
    return {
      baseUrl: this.config.WACRM_BASE_URL,
      apiKey: this.config.WACRM_API_KEY,
      webhookSecret: this.config.WACRM_WEBHOOK_SECRET,
      enabled: this.config.WACRM_ENABLED,
    };
  }

  getPeskidsWhatsAppConfig() {
    return {
      enabled: this.config.PESKIDS_WHATSAPP_ENABLED,
      provider: this.config.PESKIDS_WHATSAPP_PROVIDER,
      approvalRequired: this.config.PESKIDS_WHATSAPP_APPROVAL_REQUIRED,
      sandbox: this.config.PESKIDS_WHATSAPP_SANDBOX,
      n8nWebhookUrl: this.config.N8N_PESKIDS_WEBHOOK_URL,
      n8nWebhookSecret: this.config.N8N_PESKIDS_WEBHOOK_SECRET,
    };
  }

  getTwentyConfig() {
    return {
      enabled: this.config.TWENTY_ENABLED,
      apiUrl: this.config.TWENTY_API_URL,
      apiKey: this.config.TWENTY_API_KEY,
    };
  }

  getSupabaseConfig() {
    return {
      url: this.config.SUPABASE_URL,
      serviceRoleKey: this.config.SUPABASE_SERVICE_ROLE_KEY,
    };
  }

  isWhatsAppEnabled(): boolean {
    return this.config.PESKIDS_WHATSAPP_ENABLED;
  }

  isSandboxMode(): boolean {
    return this.config.PESKIDS_WHATSAPP_SANDBOX;
  }

  isApprovalRequired(): boolean {
    return this.config.PESKIDS_WHATSAPP_APPROVAL_REQUIRED;
  }

  getProvider(): 'wacrm' | 'meta' | 'openwa' {
    return this.config.PESKIDS_WHATSAPP_PROVIDER;
  }
}

export const whatsappConfig = new WhatsAppConfigManager();
