import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveShieldDiscordWebhook, shieldAlertConfigBodySchema } from '../shield-alert-config';

describe('shieldAlertConfigBodySchema', () => {
  it('accepts valid payload', () => {
    const r = shieldAlertConfigBodySchema.safeParse({
      tenant_slug: 'acme-corp',
      alert_type: 'endpoint_caido',
      webhook_url: 'https://discord.com/api/webhooks/123/abc',
      threshold: { cpu: 80, response_time: 5000 },
    });
    expect(r.success).toBe(true);
  });

  it('rejects invalid alert_type', () => {
    const r = shieldAlertConfigBodySchema.safeParse({
      tenant_slug: 'acme-corp',
      alert_type: 'unknown',
    });
    expect(r.success).toBe(false);
  });
});

describe('resolveShieldDiscordWebhook', () => {
  afterEach(() => {
    delete process.env.SHIELD_ALERTS_DISCORD_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_SHIELD;
    delete process.env.DISCORD_WEBHOOK_URL;
  });

  it('prefers explicit URL', () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/env';
    expect(resolveShieldDiscordWebhook('https://discord.com/api/webhooks/explicit')).toBe(
      'https://discord.com/api/webhooks/explicit'
    );
  });

  it('falls back to SHIELD_ALERTS_DISCORD_WEBHOOK_URL', () => {
    process.env.SHIELD_ALERTS_DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/shield';
    expect(resolveShieldDiscordWebhook()).toBe('https://discord.com/api/webhooks/shield');
  });

  it('falls back to DISCORD_WEBHOOK_URL', () => {
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/global';
    expect(resolveShieldDiscordWebhook()).toBe('https://discord.com/api/webhooks/global');
  });

  it('prefers DISCORD_WEBHOOK_SHIELD over DISCORD_WEBHOOK_URL', () => {
    process.env.DISCORD_WEBHOOK_SHIELD = 'https://discord.com/api/webhooks/shield';
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/global';
    expect(resolveShieldDiscordWebhook()).toBe('https://discord.com/api/webhooks/shield');
  });

  it('returns null when nothing set', () => {
    expect(resolveShieldDiscordWebhook()).toBeNull();
  });
});
