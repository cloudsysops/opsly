import { listActiveWebhooksByEvent } from "../repositories/webhook-repository.js";

// Tipos de eventos soportados por Opsly webhooks
export type WebhookEvent =
  | "tenant.created"
  | "tenant.suspended"
  | "tenant.resumed"
  | "billing.paid"
  | "billing.failed"
  | "backup.completed"
  | "backup.failed"
  | "usage.threshold_reached";

export interface WebhookPayload {
  event: WebhookEvent;
  tenant_slug: string;
  timestamp: string;
  data: Record<string, unknown>;
}

// Encola webhooks en BullMQ via HTTP para no crear dep circular con orchestrator.
// El WebhookWorker (apps/orchestrator) consume esta cola.
const ORCHESTRATOR_INTERNAL_URL =
  process.env.ORCHESTRATOR_INTERNAL_URL ?? "http://localhost:3010";

export async function dispatchWebhookEvent(
  tenantSlug: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await listActiveWebhooksByEvent(tenantSlug, event);
  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    tenant_slug: tenantSlug,
    timestamp: new Date().toISOString(),
    data,
  };

  // Encola un job por webhook (idempotent: jobId = webhookId + event + timestamp)
  await Promise.allSettled(
    webhooks.map((wh) =>
      fetch(`${ORCHESTRATOR_INTERNAL_URL}/internal/enqueue-webhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookId: wh.id,
          url: wh.url,
          secret: wh.secret,
          payload,
        }),
      }),
    ),
  );
}
