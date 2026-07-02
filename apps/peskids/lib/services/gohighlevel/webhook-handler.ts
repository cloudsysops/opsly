/** LEGACY (GHL webhook): contact.created / contact.updated handlers. */
import { supabaseServer } from '@/lib/supabase';
import { emitEvent } from '@/lib/events';
import type { Database, Json } from '@/lib/types';

const TENANT_ID = process.env.PESKIDS_TENANT_ID || 'peskids-mvp';

const STAGE_TO_STATUS: Record<string, string> = {
  'New Lead': 'new',
  Contacted: 'contacted',
  'Trial Class': 'trial',
  Enrolled: 'enrolled',
  'Active Student': 'active',
  Renewal: 'renewal',
};

export interface PipelineEvent {
  contact_id?: string;
  contactId?: string;
  opportunity_id?: string;
  opportunityId?: string;
  pipeline_stage?: string;
  pipelineStage?: string;
  pipeline_stage_id?: string;
  pipelineStageId?: string;
  pipeline_id?: string;
  pipelineId?: string;
  [key: string]: unknown;
}

export interface ContactEvent {
  contact_id?: string;
  contactId?: string;
  email?: string;
  phone?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  source?: string;
  [key: string]: unknown;
}

function coalesceId(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const val = payload[key];
    if (typeof val === 'string' && val.length > 0) return val;
  }
  return null;
}

function coalesceStage(
  payload: Record<string, unknown>,
  ...keys: string[]
): string | null {
  for (const key of keys) {
    const val = payload[key];
    if (typeof val === 'string' && val.length > 0) {
      const mapped = STAGE_TO_STATUS[val];
      if (mapped) return mapped;
    }
  }
  const stageField = payload.stage ?? payload.status;
  if (typeof stageField === 'string') {
    return STAGE_TO_STATUS[stageField] ?? null;
  }
  return null;
}

async function logWebhookReceipt(
  eventType: string,
  payload: Record<string, unknown>,
  recordId: string
): Promise<void> {
  try {
    const supabase = supabaseServer();
    await supabase.schema('public').from('webhook_logs').insert({
      tenant_id: TENANT_ID,
      provider: 'gohighlevel',
      event_type: eventType,
      record_id: recordId,
      payload: payload as unknown as Json,
      received_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[ghl] failed to log webhook receipt:', err);
  }
}

export async function handlePipelineStageUpdate(
  payload: PipelineEvent
): Promise<void> {
  const contactId =
    coalesceId(payload, 'contact_id', 'contactId') ?? '';
  const stageName = coalesceStage(
    payload,
    'pipeline_stage',
    'pipelineStage',
    'stage'
  );
  const opportunityId = coalesceId(
    payload,
    'opportunity_id',
    'opportunityId'
  );

  if (!contactId && !opportunityId) {
    console.warn('[ghl] pipeline stage update missing contact/opportunity ID');
    return;
  }

  if (!stageName) {
    console.warn('[ghl] pipeline stage update: no recognized stage');
    return;
  }

  const supabase = supabaseServer();

  if (contactId) {
    const { data: existingLead, error: lookupErr } = await supabase
      .schema('public')
      .from('leads')
      .select('id, status')
      .eq('tenant_id', TENANT_ID)
      .or(`contact_id.eq.${contactId},ghl_contact_id.eq.${contactId}`)
      .limit(1)
      .maybeSingle();

    if (lookupErr) {
      console.error('[ghl] error looking up lead by contact:', lookupErr.message);
      return;
    }

    if (existingLead) {
      const { error: updateErr } = await supabase
        .schema('public')
        .from('leads')
        .update({
          status: stageName as Database['public']['Tables']['leads']['Update']['status'],
        })
        .eq('id', existingLead.id);

      if (updateErr) {
        console.error('[ghl] error updating lead status:', updateErr.message);
        return;
      }

      const targetId = existingLead.id;

      await emitEvent('lead.stage.updated', {
        lead_id: targetId,
        contact_id: contactId,
        opportunity_id: opportunityId,
        previous_status: existingLead.status,
        new_status: stageName,
      });

      await logWebhookReceipt('opportunity.stage.updated', payload, targetId);
      console.log(
        `[ghl] updated lead ${targetId} status: ${existingLead.status} → ${stageName}`
      );
    } else {
      console.log(
        `[ghl] no local lead found for GHL contact ${contactId}; ignoring stage update`
      );
    }
  } else if (opportunityId) {
    console.log(
      `[ghl] stage update for opportunity ${opportunityId} (no contact_id); skipping lead lookup`
    );
  }
}

export async function handleContactCreated(
  payload: ContactEvent
): Promise<void> {
  const contactId =
    coalesceId(payload, 'contact_id', 'contactId') ?? '';
  if (!contactId) {
    console.warn('[ghl] contact.created missing contact ID');
    return;
  }

  const supabase = supabaseServer();

  const { data: existingLead } = await supabase
    .schema('public')
    .from('leads')
    .select('id')
    .eq('tenant_id', TENANT_ID)
    .or(`contact_id.eq.${contactId},ghl_contact_id.eq.${contactId}`)
    .limit(1)
    .maybeSingle();

  if (existingLead) {
    console.log(`[ghl] lead already exists for contact ${contactId}; skipping`);
    return;
  }

  const name =
    payload.name?.trim() ||
    [payload.firstName, payload.lastName].filter(Boolean).join(' ').trim() ||
    'GHL Contact';
  const email = payload.email?.trim() ?? '';
  const phone = payload.phone?.trim() ?? null;
  const source = payload.source?.trim() ?? 'gohighlevel';

  const { data: insertedLead, error: insertErr } = await supabase
    .schema('public')
    .from('leads')
    .insert({
      tenant_id: TENANT_ID,
      name: String(name),
      email: String(email),
      phone: phone ? String(phone) : null,
      grade_interested: '',
      referral_source: source,
      status: 'new',
    })
    .select('id')
    .single();

  if (insertErr || !insertedLead) {
    console.error('[ghl] error creating lead from contact:', insertErr?.message);
    return;
  }

  await supabase
    .schema('public')
    .from('leads')
    .update({ ghl_contact_id: contactId })
    .eq('id', insertedLead.id);

  await emitEvent('lead.created', {
    lead_id: insertedLead.id,
    name,
    email,
    phone,
    source,
    contact_id: contactId,
  });

  await logWebhookReceipt('contact.created', payload, insertedLead.id);
  console.log(`[ghl] created lead ${insertedLead.id} from contact ${contactId}`);
}

export async function handleContactUpdated(
  payload: ContactEvent
): Promise<void> {
  const contactId =
    coalesceId(payload, 'contact_id', 'contactId') ?? '';
  if (!contactId) {
    console.warn('[ghl] contact.updated missing contact ID');
    return;
  }

  const supabase = supabaseServer();

  const { data: existingLead, error: lookupErr } = await supabase
    .schema('public')
    .from('leads')
    .select('id, name, email, phone')
    .eq('tenant_id', TENANT_ID)
    .or(`contact_id.eq.${contactId},ghl_contact_id.eq.${contactId}`)
    .limit(1)
    .maybeSingle();

  if (lookupErr || !existingLead) {
    console.log(
      `[ghl] no local lead for contact ${contactId}; skipping update`
    );
    return;
  }

  const updates: Database['public']['Tables']['leads']['Update'] = {};

  if (payload.name?.trim()) updates.name = payload.name.trim();
  if (payload.email?.trim()) updates.email = payload.email.trim();
  if (payload.phone?.trim()) updates.phone = payload.phone.trim();
  if (payload.firstName?.trim() && !payload.name?.trim()) {
    updates.name = [payload.firstName.trim(), (payload.lastName ?? '').trim()]
      .filter(Boolean)
      .join(' ');
  }

  if (Object.keys(updates).length === 0) {
    console.log(`[ghl] contact updated with no field changes for lead ${existingLead.id}`);
    return;
  }

  const { error: updateErr } = await supabase
    .schema('public')
    .from('leads')
    .update(updates)
    .eq('id', existingLead.id);

  if (updateErr) {
    console.error('[ghl] error updating lead from contact:', updateErr.message);
    return;
  }

  await emitEvent('lead.updated', {
    lead_id: existingLead.id,
    contact_id: contactId,
    updates: Object.keys(updates),
  });

  await logWebhookReceipt('contact.updated', payload, existingLead.id);
  console.log(`[ghl] synced contact ${contactId} → lead ${existingLead.id}`);
}
