export interface WebhookConfig {
  id: string;
  webhook_url: string;
  secret: string;
  is_active: boolean;
  failure_count: number;
}

export interface WebhookTriggerPayload {
  form_id: string;
  submission_id: string;
  tenant_slug: string;
  form_data: Record<string, unknown>;
  timestamp: number;
  user_id?: string;
}

export interface WebhookTriggerResult {
  success: number;
  failed: number;
  errors: string[];
}
