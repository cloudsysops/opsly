import { supabaseServer } from '@/lib/supabase';
import { emitEvent } from '@/lib/events';
import {
  extractLeadFromJelou,
  extractFeedbackFromJelou,
  type JelouWebhookPayload,
} from '@/lib/jelou';
import { buildPeskidsReferralCode, PESKIDS_REFERRAL_DISCOUNT_CENTS } from '@/lib/peskids-referrals';
import { buildPeskidsReferralLink, normalizeReferralCode } from '@/lib/peskids-referral-links';
import { isMissingExpandedFeedbackColumn } from '@/lib/utils/db-compat';
import type { Database, Json } from '@/lib/types';

const TENANT_ID = process.env.PESKIDS_TENANT_ID || 'peskids-mvp';

export async function handleLeadSubmission(webhook: JelouWebhookPayload): Promise<{
  status: string;
  lead_id: string;
  referral_code: string | null;
  referral_link: string | null;
  message: string;
}> {
  const supabase = supabaseServer();
  const lead = extractLeadFromJelou(webhook);

  const { data, error } = await supabase
    .schema('public')
    .from('leads')
    .insert({
      tenant_id: TENANT_ID,
      name: String(lead.name),
      email: String(lead.email),
      phone: lead.phone != null ? String(lead.phone) : null,
      class_modality: lead.class_modality,
      neighborhood: lead.neighborhood || null,
      grade_interested: String(lead.interested_grade),
      referral_source: lead.source,
      referred_by_code: normalizeReferralCode(lead.referred_by_code),
      referral_discount_cents: 0,
      referral_redemptions: 0,
    })
    .select('id, referral_code')
    .single();

  if (error) throw new Error(`DB error inserting lead: ${error.message}`);

  let referralCode = data.referral_code;
  if (data.id && !referralCode) {
    referralCode = buildPeskidsReferralCode({
      tenantId: TENANT_ID,
      leadId: data.id,
      email: String(lead.email),
    });
    const { error: refErr } = await supabase
      .schema('public')
      .from('leads')
      .update({ referral_code: referralCode })
      .eq('id', data.id);
    if (refErr) console.warn('[jelou] failed to persist referral code:', refErr.message);
  }

  const referredByCode = normalizeReferralCode(lead.referred_by_code);
  if (referredByCode) {
    const { data: referrerRows, error: referrerErr } = await supabase
      .schema('public')
      .from('leads')
      .select('id, referral_discount_cents, referral_redemptions')
      .eq('tenant_id', TENANT_ID)
      .eq('referral_code', referredByCode)
      .limit(1);
    if (!referrerErr && referrerRows?.[0]) {
      const referrer = referrerRows[0];
      const { error: updErr } = await supabase
        .schema('public')
        .from('leads')
        .update({
          referral_discount_cents:
            (referrer.referral_discount_cents ?? 0) + PESKIDS_REFERRAL_DISCOUNT_CENTS,
          referral_redemptions: (referrer.referral_redemptions ?? 0) + 1,
        })
        .eq('id', referrer.id);
      if (updErr) console.warn('[jelou] failed to update referrer credit:', updErr.message);
    }
  }

  await emitEvent('lead.created', {
    lead_id: data.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    interested_grade: lead.interested_grade,
    source: lead.source,
    channel: webhook.data.channel,
    contact_id: lead.contact_id,
    referral_code: referralCode,
    referral_link: referralCode ? buildPeskidsReferralLink(referralCode) : null,
  });

  await logWebhookReceipt('lead.created', webhook, data.id);

  return {
    status: 'success',
    lead_id: data.id,
    referral_code: referralCode,
    referral_link: referralCode ? buildPeskidsReferralLink(referralCode) : null,
    message: 'Lead received. We will follow up shortly.',
  };
}

export async function handleFeedbackSubmission(webhook: JelouWebhookPayload): Promise<{
  status: string;
  feedback_id: string;
  message: string;
}> {
  const supabase = supabaseServer();
  const feedback = extractFeedbackFromJelou(webhook);

  const expandedPayload: Database['public']['Tables']['feedback']['Insert'] = {
    tenant_id: TENANT_ID,
    child_name: String(feedback.student_name),
    satisfaction: feedback.satisfaction,
    suggestion: String(feedback.suggestion),
    contact_wanted: Boolean(feedback.follow_up_wanted),
    parent_email: null,
    author_type: 'parent' as const,
    author_ref_id: null,
    subject_type: 'student' as const,
    subject_ref_id: null,
    body: String(feedback.suggestion),
    rating: feedback.satisfaction,
    status: (feedback.satisfaction <= 2 ? 'action_required' : 'new') as 'action_required' | 'new',
  };

  const legacyPayload: Database['public']['Tables']['feedback']['Insert'] = {
    tenant_id: TENANT_ID,
    child_name: String(feedback.student_name),
    satisfaction: feedback.satisfaction,
    suggestion: String(feedback.suggestion),
    contact_wanted: Boolean(feedback.follow_up_wanted),
    parent_email: null,
  };

  const { data, error } = await supabase
    .schema('public')
    .from('feedback')
    .insert(expandedPayload)
    .select('id')
    .single();

  if (!error) {
    await emitFeedbackEvents(data.id, feedback);
    await logWebhookReceipt('feedback.created', webhook, data.id);
    return { status: 'success', feedback_id: data.id, message: 'Thank you for your feedback!' };
  }

  if (!isMissingExpandedFeedbackColumn(error)) {
    throw new Error(`DB error inserting feedback: ${error.message}`);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .schema('public')
    .from('feedback')
    .insert(legacyPayload)
    .select('id')
    .single();

  if (legacyError) throw new Error(`DB error inserting legacy feedback: ${legacyError.message}`);

  await emitFeedbackEvents(legacyData.id, feedback);
  await logWebhookReceipt('feedback.created', webhook, legacyData.id);
  return { status: 'success', feedback_id: legacyData.id, message: 'Thank you for your feedback!' };
}

async function emitFeedbackEvents(
  feedbackId: string,
  feedback: ReturnType<typeof extractFeedbackFromJelou>
) {
  await emitEvent('feedback.created', {
    feedback_id: feedbackId,
    student_name: feedback.student_name,
    child_name: feedback.student_name,
    satisfaction: feedback.satisfaction,
    suggestion: feedback.suggestion,
    body: feedback.suggestion,
    rating: feedback.satisfaction,
    follow_up_wanted: feedback.follow_up_wanted,
    channel: feedback.channel,
    contact_id: feedback.contact_id,
    author_type: 'parent',
    subject_type: 'student',
  });

  if (feedback.satisfaction <= 2) {
    await emitEvent('feedback.alert', {
      feedback_id: feedbackId,
      severity: 'high',
      reason: 'Low satisfaction score',
    });
  }
}

async function logWebhookReceipt(
  event_type: string,
  webhook: JelouWebhookPayload,
  record_id: string
) {
  try {
    const supabase = supabaseServer();
    await supabase
      .schema('public')
      .from('webhook_logs')
      .insert({
        tenant_id: TENANT_ID,
        provider: 'jelou',
        event_type,
        record_id,
        payload: webhook as unknown as Json,
        received_at: new Date().toISOString(),
      });
  } catch (err) {
    console.warn('[jelou] failed to log webhook receipt:', err);
  }
}
