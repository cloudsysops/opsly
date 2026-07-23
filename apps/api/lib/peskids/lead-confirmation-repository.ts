import { getServiceClient } from '../supabase';

export type LeadEmailDeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type LeadEmailDeliveryRow = {
  id: string;
  tenant_slug: string;
  lead_id: string;
  email_type: string;
  idempotency_key: string;
  status: LeadEmailDeliveryStatus;
  to_email: string;
  provider_message_id: string | null;
  error_detail: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
};

export async function findLeadEmailDeliveryByKey(
  idempotencyKey: string
): Promise<LeadEmailDeliveryRow | null> {
  const client = getServiceClient();
  const { data, error } = await client
    .schema('platform')
    .from('peskids_lead_email_deliveries')
    .select(
      'id, tenant_slug, lead_id, email_type, idempotency_key, status, to_email, provider_message_id, error_detail, created_at, updated_at, sent_at'
    )
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();

  if (error !== null) {
    throw new Error(error.message);
  }
  return data as LeadEmailDeliveryRow | null;
}

export async function insertPendingLeadEmailDelivery(input: {
  tenant_slug: string;
  lead_id: string;
  idempotency_key: string;
  to_email: string;
}): Promise<LeadEmailDeliveryRow> {
  const client = getServiceClient();
  const { data, error } = await client
    .schema('platform')
    .from('peskids_lead_email_deliveries')
    .insert({
      tenant_slug: input.tenant_slug,
      lead_id: input.lead_id,
      email_type: 'lead_confirmation',
      idempotency_key: input.idempotency_key,
      status: 'pending',
      to_email: input.to_email,
    })
    .select(
      'id, tenant_slug, lead_id, email_type, idempotency_key, status, to_email, provider_message_id, error_detail, created_at, updated_at, sent_at'
    )
    .single();

  if (error !== null || data === null) {
    throw new Error(error?.message ?? 'insert lead email delivery failed');
  }
  return data as LeadEmailDeliveryRow;
}

export async function updateLeadEmailDeliveryStatus(input: {
  id: string;
  status: Exclude<LeadEmailDeliveryStatus, 'pending'>;
  provider_message_id?: string | null;
  error_detail?: string | null;
}): Promise<void> {
  const client = getServiceClient();
  const now = new Date().toISOString();
  const { error } = await client
    .schema('platform')
    .from('peskids_lead_email_deliveries')
    .update({
      status: input.status,
      provider_message_id: input.provider_message_id ?? null,
      error_detail: input.error_detail ?? null,
      updated_at: now,
      sent_at: input.status === 'sent' ? now : null,
    })
    .eq('id', input.id);

  if (error !== null) {
    throw new Error(error.message);
  }
}
