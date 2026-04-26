import type { Tenant } from '../supabase/types';

const MAX_ERROR_SLICE = 900;

function getWebhookUrl(): string | null {
  const url = process.env.DISCORD_WEBHOOK_URL;
  return url && url.length > 0 ? url : null;
}

async function postDiscord(content: string): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord webhook failed: ${response.status} ${text}`);
  }
}

export async function notifyTenantCreated(tenant: Tenant): Promise<void> {
  await postDiscord(
    `**Tenant created** — \`${tenant.slug}\` (${tenant.plan}) for ${tenant.owner_email}`
  );
}

export async function notifyTenantFailed(slug: string, error: string): Promise<void> {
  await postDiscord(`**Tenant onboarding failed** — \`${slug}\`: ${error}`);
}

export async function notifyInvoicePaymentFailed(slug: string, invoiceId: string): Promise<void> {
  await postDiscord(`**Invoice payment failed** — tenant \`${slug}\`, invoice \`${invoiceId}\``);
}

/** Alerta operativa cuando el handler de webhook Stripe falla tras verificación (p. ej. provision). */
export async function notifyStripeWebhookCritical(
  eventType: string,
  error: string,
  tenantSlug?: string
): Promise<void> {
  const webhookUrl = getWebhookUrl();
  if (!webhookUrl) {
    return;
  }
  const slugPart = tenantSlug ? `tenant \`${tenantSlug}\` — ` : '';
  try {
    await postDiscord(
      `**Stripe webhook CRITICAL** (\`${eventType}\`) — ${slugPart}${error.slice(0, MAX_ERROR_SLICE)}`
    );
  } catch {
    /* ya logueado en postDiscord; no bloquear respuesta al webhook */
  }
}
