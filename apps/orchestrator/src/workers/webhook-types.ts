// Tipos compartidos para el sistema de webhooks outbound
export type WebhookEventType =
  | 'tenant.created'
  | 'tenant.suspended'
  | 'tenant.resumed'
  | 'billing.paid'
  | 'billing.failed'
  | 'backup.completed'
  | 'backup.failed'
  | 'usage.threshold_reached';

export interface WebhookPayload {
  event: WebhookEventType;
  tenant_slug: string;
  timestamp: string;
  data: Record<string, unknown>;
}
