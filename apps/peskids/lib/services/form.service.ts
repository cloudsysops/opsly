import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

export type FormTemplate =
  Database['peskids']['Tables']['form_templates']['Row'];
export type FormDelivery =
  Database['peskids']['Tables']['form_deliveries']['Row'];
export type FormResponse =
  Database['peskids']['Tables']['form_responses']['Row'];

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

// ========================
// FORM TEMPLATES
// ========================

export async function createFormTemplate(input: {
  name: string;
  description?: string;
  formType: 'enrolled_family' | 'prospective_family' | 'trial_class';
  fields: Array<{
    name: string;
    label: string;
    type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox';
    required: boolean;
    placeholder?: string;
    options?: string[];
  }>;
}): Promise<FormTemplate> {
  const { data, error } = await peskidsClient()
    .from('form_templates')
    .insert({
      tenant_slug: tenantSlug(),
      name: input.name,
      description: input.description,
      form_type: input.formType,
      fields: input.fields,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as FormTemplate;
}

export async function getFormTemplate(
  templateId: string
): Promise<FormTemplate | null> {
  const { data, error } = await peskidsClient()
    .from('form_templates')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('id', templateId)
    .eq('status', 'active')
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as FormTemplate | null;
}

export async function listFormTemplates(
  formType?: string
): Promise<FormTemplate[]> {
  let query = peskidsClient()
    .from('form_templates')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('status', 'active');

  if (formType) {
    query = query.eq('form_type', formType);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) throw error;
  return (data ?? []) as FormTemplate[];
}

// ========================
// FORM DELIVERY
// ========================

export async function sendForm(input: {
  templateId: string;
  recipientEmail: string;
  recipientPhone?: string;
  recipientName: string;
  deliveryMethod: 'email' | 'sms' | 'whatsapp';
  expiresInDays?: number;
}): Promise<FormDelivery> {
  const expiresAt = input.expiresInDays
    ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  const formLink = `${process.env.NEXT_PUBLIC_PESKIDS_URL || 'https://peskids.op-sly.com'}/familias/form/${input.templateId}?delivery_id=`;

  const { data, error } = await peskidsClient()
    .from('form_deliveries')
    .insert({
      tenant_slug: tenantSlug(),
      template_id: input.templateId,
      recipient_email: input.recipientEmail,
      recipient_phone: input.recipientPhone || null,
      recipient_name: input.recipientName,
      delivery_method: input.deliveryMethod,
      expires_at: expiresAt.toISOString(),
      form_link: formLink,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as FormDelivery;
}

export async function getFormDelivery(deliveryId: string): Promise<FormDelivery | null> {
  const { data, error } = await peskidsClient()
    .from('form_deliveries')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('id', deliveryId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as FormDelivery | null;
}

// ========================
// FORM RESPONSES
// ========================

export async function submitFormResponse(input: {
  deliveryId: string;
  templateId: string;
  responseData: Record<string, unknown>;
  ipAddress?: string;
}): Promise<FormResponse> {
  const { data, error } = await peskidsClient()
    .from('form_responses')
    .insert({
      tenant_slug: tenantSlug(),
      delivery_id: input.deliveryId,
      template_id: input.templateId,
      response_data: input.responseData,
      ip_address: input.ipAddress || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as FormResponse;
}

export async function getFormResponse(
  responseId: string
): Promise<FormResponse | null> {
  const { data, error } = await peskidsClient()
    .from('form_responses')
    .select('*')
    .eq('tenant_slug', tenantSlug())
    .eq('id', responseId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return (data ?? null) as FormResponse | null;
}

export async function listPendingCRMSync(limit: number = 50): Promise<
  (FormResponse & {
    delivery: FormDelivery;
    template: FormTemplate;
  })[]
> {
  const { data, error } = await peskidsClient()
    .from('form_responses')
    .select('*, delivery:delivery_id(*), template:template_id(*)')
    .eq('tenant_slug', tenantSlug())
    .eq('crm_sync_status', 'pending')
    .order('submitted_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as (FormResponse & {
    delivery: FormDelivery;
    template: FormTemplate;
  })[];
}

export async function markCRMSynced(input: {
  responseId: string;
  crmContactId: string;
}): Promise<FormResponse> {
  const { data, error } = await peskidsClient()
    .from('form_responses')
    .update({
      crm_sync_status: 'synced',
      crm_contact_id: input.crmContactId,
      crm_synced_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('id', input.responseId)
    .select('*')
    .single();

  if (error) throw error;
  return data as FormResponse;
}

export async function markCRMSyncFailed(
  responseId: string
): Promise<FormResponse> {
  const { data, error } = await peskidsClient()
    .from('form_responses')
    .update({
      crm_sync_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('id', responseId)
    .select('*')
    .single();

  if (error) throw error;
  return data as FormResponse;
}

export async function scheduleTrialClass(
  responseId: string,
  scheduledAt: string
): Promise<FormResponse> {
  const { data, error } = await peskidsClient()
    .from('form_responses')
    .update({
      trial_class_scheduled_at: scheduledAt,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug())
    .eq('id', responseId)
    .select('*')
    .single();

  if (error) throw error;
  return data as FormResponse;
}
