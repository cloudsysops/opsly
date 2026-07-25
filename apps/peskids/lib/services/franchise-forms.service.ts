import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

/**
 * Franchise Forms Service
 * Manages form templates and responses scoped to franchises
 */

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

/**
 * Provision form template for a franchise
 * Admin-only: assign existing template to franchise with customizations
 */
export async function assignFormToFranchise(input: {
  franchiseTenantId: string;
  templateId: string;
  customName?: string;
  customDescription?: string;
  isPrimary?: boolean;
}): Promise<{
  success: boolean;
  assignmentId?: string;
  error?: string;
}> {
  try {
    const { data, error } = await peskidsClient()
      .from('franchise_form_templates')
      .insert({
        franchise_tenant_id: input.franchiseTenantId,
        template_id: input.templateId,
        custom_name: input.customName || null,
        custom_description: input.customDescription || null,
        is_primary: input.isPrimary || false,
        is_enabled: true,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      assignmentId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign form to franchise',
    };
  }
}

/**
 * Get forms available to a franchise
 * Returns templates assigned to this franchise
 */
export async function getFranchiseForms(franchiseTenantId: string): Promise<{
  success: boolean;
  forms?: Array<{
    id: string;
    templateId: string;
    name: string;
    description?: string;
    formType: string;
    fields: unknown;
    isPrimary: boolean;
    isEnabled: boolean;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await peskidsClient()
      .from('franchise_form_templates')
      .select(
        `
        id,
        template_id,
        custom_name,
        custom_description,
        is_primary,
        is_enabled,
        form_templates(name, description, form_type, fields)
      `
      )
      .eq('franchise_tenant_id', franchiseTenantId)
      .eq('is_enabled', true)
      .order('is_primary', { ascending: false });

    if (error) throw error;

    const forms = (data || []).map((assignment: any) => ({
      id: assignment.id,
      templateId: assignment.template_id,
      name: assignment.custom_name || assignment.form_templates?.name || 'Untitled Form',
      description:
        assignment.custom_description || assignment.form_templates?.description,
      formType: assignment.form_templates?.form_type,
      fields: assignment.form_templates?.fields || [],
      isPrimary: assignment.is_primary,
      isEnabled: assignment.is_enabled,
    }));

    return {
      success: true,
      forms,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get franchise forms',
    };
  }
}

/**
 * Send form to family (franchise-scoped)
 * Records delivery for tracking
 */
export async function sendFormToFamily(input: {
  franchiseTenantId: string;
  formAssignmentId: string;
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  recipientPhone?: string;
  deliveryMethod: 'email' | 'sms' | 'whatsapp';
  expiresInDays?: number;
}): Promise<{
  success: boolean;
  deliveryId?: string;
  error?: string;
}> {
  try {
    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (input.expiresInDays || 30));

    // Generate form link
    const formLink = `https://${input.franchiseTenantId}.op-sly.com/forms/${input.formAssignmentId}?email=${encodeURIComponent(input.recipientEmail)}`;

    const { data, error } = await peskidsClient()
      .from('form_deliveries')
      .insert({
        tenant_slug: tenantSlug(),
        franchise_tenant_id: input.franchiseTenantId,
        template_id: input.templateId,
        recipient_email: input.recipientEmail,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone || null,
        delivery_method: input.deliveryMethod,
        form_link: formLink,
        expires_at: expiresAt.toISOString(),
        delivery_status: 'pending',
        sent_at: null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    // TODO: Actually send via email/SMS/WhatsApp provider
    console.log(`Form delivery created: ${data.id} -> ${input.recipientEmail}`);

    return {
      success: true,
      deliveryId: data.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send form',
    };
  }
}

/**
 * Submit form response (public, doesn't require auth)
 * Validates delivery link and records response
 */
export async function submitFormResponse(input: {
  deliveryId: string;
  templateId: string;
  responseData: Record<string, unknown>;
  ipAddress?: string;
}): Promise<{
  success: boolean;
  responseId?: string;
  error?: string;
}> {
  try {
    // Verify delivery exists and hasn't expired
    const { data: delivery, error: deliveryError } = await peskidsClient()
      .from('form_deliveries')
      .select('id, expires_at, franchise_tenant_id')
      .eq('id', input.deliveryId)
      .single();

    if (deliveryError || !delivery) {
      return {
        success: false,
        error: 'Form delivery not found',
      };
    }

    if (new Date(delivery.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Form has expired',
      };
    }

    // Record response
    const { data: response, error: responseError } = await peskidsClient()
      .from('form_responses')
      .insert({
        tenant_slug: tenantSlug(),
        franchise_tenant_id: delivery.franchise_tenant_id,
        delivery_id: input.deliveryId,
        template_id: input.templateId,
        response_data: input.responseData,
        ip_address: input.ipAddress || null,
        submitted_at: new Date().toISOString(),
        crm_sync_status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (responseError) throw responseError;

    return {
      success: true,
      responseId: response.id,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit form response',
    };
  }
}

/**
 * Get form responses for a franchise
 * Admin view of responses
 */
export async function getFranchiseFormResponses(franchiseTenantId: string): Promise<{
  success: boolean;
  responses?: Array<{
    id: string;
    deliveryId: string;
    templateId: string;
    recipientEmail: string;
    responseData: Record<string, unknown>;
    submittedAt: string;
    crmSyncStatus: string;
  }>;
  error?: string;
}> {
  try {
    const { data, error } = await peskidsClient()
      .from('form_responses')
      .select(
        `
        id,
        delivery_id,
        template_id,
        response_data,
        submitted_at,
        crm_sync_status,
        form_deliveries(recipient_email)
      `
      )
      .eq('franchise_tenant_id', franchiseTenantId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;

    const responses = (data || []).map((row: any) => ({
      id: row.id,
      deliveryId: row.delivery_id,
      templateId: row.template_id,
      recipientEmail: row.form_deliveries?.recipient_email,
      responseData: row.response_data,
      submittedAt: row.submitted_at,
      crmSyncStatus: row.crm_sync_status,
    }));

    return {
      success: true,
      responses,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get franchise responses',
    };
  }
}

/**
 * Get primary form for a franchise
 * Used by public form endpoints
 */
export async function getFranchisePrimaryForm(franchiseTenantId: string): Promise<{
  success: boolean;
  form?: {
    assignmentId: string;
    templateId: string;
    name: string;
    fields: unknown;
  };
  error?: string;
}> {
  try {
    const { data, error } = await peskidsClient()
      .from('franchise_form_templates')
      .select(
        `
        id,
        template_id,
        custom_name,
        form_templates(name, fields)
      `
      )
      .eq('franchise_tenant_id', franchiseTenantId)
      .eq('is_primary', true)
      .eq('is_enabled', true)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: 'No primary form configured for this franchise',
      };
    }

    return {
      success: true,
      form: {
        assignmentId: data.id,
        templateId: data.template_id,
        name: data.custom_name || data.form_templates?.name || 'Sign Up',
        fields: data.form_templates?.fields || [],
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get primary form',
    };
  }
}
