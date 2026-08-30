/**
 * Multi-channel notification dispatcher for Peskids.
 * Channels: email (Resend), WhatsApp (n8n), in-app (Supabase peskids.notifications), Web Push.
 * All channels are fire-and-forget — errors are logged, never thrown.
 */

import webpush from 'web-push';
import { resolvePeskidsInternalSecret } from '@/lib/internal-auth';
import { supabaseServer } from '@/lib/supabase';
import type { NotificationEventType } from '@/lib/types';

export type { NotificationEventType };

export interface SendNotificationParams {
  type: NotificationEventType;
  recipientUserId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
  tenantSlug?: string;
}

interface NotificationPrefs {
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  inapp_enabled: boolean;
  events: string[];
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_enabled: true,
  whatsapp_enabled: false,
  inapp_enabled: true,
  events: [
    'submission_reviewed',
    'submission_observation',
    'submission_reassigned',
    'followup_due',
    'weekly_report',
  ],
};

async function fetchPrefs(
  userId: string,
  tenantSlug: string
): Promise<NotificationPrefs> {
  try {
    const client = supabaseServer();
    const { data, error } = await client
      .schema('peskids')
      .from('notification_preferences')
      .select('email_enabled, whatsapp_enabled, inapp_enabled, events')
      .eq('user_id', userId)
      .eq('tenant_slug', tenantSlug)
      .maybeSingle();

    if (error || !data) {
      return DEFAULT_PREFS;
    }

    return {
      email_enabled: data.email_enabled,
      whatsapp_enabled: data.whatsapp_enabled,
      inapp_enabled: data.inapp_enabled,
      events: Array.isArray(data.events) ? (data.events as string[]) : DEFAULT_PREFS.events,
    };
  } catch (err) {
    console.error('[notifications] fetchPrefs error', err);
    return DEFAULT_PREFS;
  }
}

async function generateMagicLinkUrl(email: string, redirectTo = '/familias/submissions'): Promise<string> {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_TENANT_DOMAIN ?? '').replace(/\/$/, '');
  const fallback = appUrl ? `${appUrl}/familias` : '/familias';

  const internalSecret = resolvePeskidsInternalSecret();
  if (!appUrl || !internalSecret) {
    return fallback;
  }

  try {
    const res = await fetch(`${appUrl}/api/auth/magic-link`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({ email, redirectTo }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return fallback;
    const data = (await res.json()) as { url?: string };
    return typeof data.url === 'string' && data.url ? data.url : fallback;
  } catch {
    return fallback;
  }
}

async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
  platformUrl?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[notifications] RESEND_API_KEY not configured — skipping email');
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL ?? 'noreply@op-sly.com';

  const ctaButton = params.platformUrl
    ? `<div style="margin-top:24px;text-align:center"><a href="${params.platformUrl}" style="display:inline-block;background:#6366f1;color:#fff;font-family:sans-serif;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:10px">Ver en Peskids →</a></div>`
    : '';

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;padding:24px;max-width:600px;margin:auto"><h2 style="color:#1a1a1a">${escapeHtml(params.subject)}</h2><p style="color:#444;line-height:1.6">${escapeHtml(params.body)}</p>${ctaButton}</body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: params.to,
        subject: params.subject,
        html,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error('[notifications] Resend returned', res.status, await res.text());
    }
  } catch (err) {
    console.error('[notifications] sendEmail error', err);
  }
}

async function sendWhatsApp(params: {
  to: string;
  type: NotificationEventType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
  tenantSlug: string;
  recipientEmail?: string;
}): Promise<void> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/$/, '');
  if (!base) {
    console.warn('[notifications] N8N_WEBHOOK_BASE_URL not configured — skipping WhatsApp');
    return;
  }

  const url = `${base}/peskids-notify`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: params.type,
        to: params.to,
        title: params.title,
        body: params.body,
        tenant_id: params.tenantSlug,
        metadata: {
          ...params.metadata,
          recipientEmail: params.recipientEmail,
        },
      }),
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      console.error('[notifications] n8n peskids-notify returned', res.status);
    }
  } catch (err) {
    console.error('[notifications] sendWhatsApp error', err);
  }
}

async function insertInApp(params: {
  userId: string;
  tenantSlug: string;
  type: NotificationEventType;
  title: string;
  body: string;
  metadata: Record<string, unknown>;
}): Promise<void> {
  try {
    const client = supabaseServer();
    const { error } = await client
      .schema('peskids')
      .from('notifications')
      .insert({
        user_id: params.userId,
        tenant_slug: params.tenantSlug,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata: params.metadata,
      });

    if (error) {
      console.error('[notifications] insertInApp error', error);
    }
  } catch (err) {
    console.error('[notifications] insertInApp exception', err);
  }
}

interface WebPushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendWebPush(userId: string, payload: WebPushPayload): Promise<void> {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('[notifications] VAPID keys not configured — skipping Web Push');
    return;
  }

  webpush.setVapidDetails(
    'mailto:noreply@op-sly.com',
    vapidPublicKey,
    vapidPrivateKey
  );

  let subscriptions: Array<{ endpoint: string; p256dh: string; auth: string }> = [];

  try {
    const client = supabaseServer();
    const { data, error } = await client
      .schema('peskids')
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)
      .eq('tenant_slug', 'peskids');

    if (error) {
      console.error('[notifications] sendWebPush fetch subscriptions error', error);
      return;
    }

    subscriptions = data ?? [];
  } catch (err) {
    console.error('[notifications] sendWebPush fetch subscriptions exception', err);
    return;
  }

  if (subscriptions.length === 0) {
    return;
  }

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/familias',
    tag: payload.tag ?? 'peskids-notification',
  });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        );
      } catch (err) {
        console.error('[notifications] sendWebPush delivery error for endpoint', sub.endpoint, err);
      }
    })
  );
}

function escapeHtml(str: string): string {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export async function sendNotification(params: SendNotificationParams): Promise<void> {
  const tenantSlug = params.tenantSlug ?? 'peskids';
  const metadata = params.metadata ?? {};

  let prefs: NotificationPrefs;

  if (params.recipientUserId) {
    prefs = await fetchPrefs(params.recipientUserId, tenantSlug);
  } else {
    // No userId: send to all provided channels, treat every event as enabled
    prefs = {
      email_enabled: !!params.recipientEmail,
      whatsapp_enabled: !!params.recipientPhone,
      inapp_enabled: false,
      events: [params.type],
    };
  }

  const eventEnabled = prefs.events.includes(params.type);

  const tasks: Promise<void>[] = [];

  if (eventEnabled && prefs.email_enabled && params.recipientEmail) {
    // Generate magic link for "Ver en Peskids" CTA in email (fire-and-forget safe: falls back to /familias)
    const emailWithMagicLink = (async () => {
      const platformUrl = await generateMagicLinkUrl(
        params.recipientEmail!,
        '/familias/submissions'
      );
      await sendEmail({
        to: params.recipientEmail!,
        subject: params.title,
        body: params.body,
        platformUrl,
      });
    })();
    tasks.push(emailWithMagicLink);
  }

  if (eventEnabled && prefs.whatsapp_enabled && params.recipientPhone) {
    tasks.push(
      sendWhatsApp({
        to: params.recipientPhone,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata,
        tenantSlug,
        recipientEmail: params.recipientEmail,
      })
    );
  }

  if (eventEnabled && prefs.inapp_enabled && params.recipientUserId) {
    tasks.push(
      insertInApp({
        userId: params.recipientUserId,
        tenantSlug,
        type: params.type,
        title: params.title,
        body: params.body,
        metadata,
      })
    );
  }

  // Web Push — reuses inapp_enabled preference; runs when userId is known
  if (eventEnabled && prefs.inapp_enabled && params.recipientUserId) {
    tasks.push(
      sendWebPush(params.recipientUserId, {
        title: params.title,
        body: params.body,
        url: typeof metadata.url === 'string' ? metadata.url : '/familias',
      })
    );
  }

  // Fire-and-forget: await all but swallow any uncaught rejections
  await Promise.allSettled(tasks);
}
