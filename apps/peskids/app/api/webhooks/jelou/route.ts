import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { emitEvent } from '@/lib/events';
import {
  buildPeskidsReferralCode,
  PESKIDS_REFERRAL_DISCOUNT_CENTS,
} from '@/lib/peskids-referrals';
import {
  buildPeskidsReferralLink,
  normalizeReferralCode,
} from '@/lib/peskids-referral-links';
import {
  verifyJelouSignature,
  parseJelouWebhook,
  extractLeadFromJelou,
  extractFeedbackFromJelou,
} from '@/lib/jelou';
import type { Database } from '@/lib/types';

const JELOU_WEBHOOK_SECRET = process.env.JELOU_WEBHOOK_SECRET || 'dev-secret';
const TENANT_ID = process.env.PESKIDS_TENANT_ID || 'peskids-mvp';

function isMissingExpandedFeedbackColumn(error: { message?: string } | null | undefined): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('author_type') ||
    message.includes('author_ref_id') ||
    message.includes('subject_type') ||
    message.includes('subject_ref_id') ||
    message.includes('rating') ||
    message.includes('ai_summary') ||
    message.includes('body') ||
    message.includes('status')
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const signature = request.headers.get('x-jelou-signature') || '';
    const body = await request.text();

    // Verify webhook signature
    if (!verifyJelouSignature(body, signature, JELOU_WEBHOOK_SECRET)) {
      console.warn('⚠️ Invalid Jelou webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const webhook = parseJelouWebhook(JSON.parse(body));

    // Route to appropriate handler
    if (webhook.event === 'form.lead_capture' || webhook.data.form_id === 'lead') {
      return await handleLeadSubmission(webhook);
    }

    if (webhook.event === 'form.feedback' || webhook.data.form_id === 'feedback') {
      return await handleFeedbackSubmission(webhook);
    }

    // Unknown form type
    console.warn(`Unknown form type: ${webhook.data.form_id}`);
    return NextResponse.json({ status: 'ignored' });
  } catch (error) {
    console.error('Jelou webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleLeadSubmission(webhook: any) {
  const supabase = supabaseServer();
  const lead = extractLeadFromJelou(webhook);

  try {
    // Insert lead into database
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

    if (error) {
      console.error('Database error inserting lead:', error);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
    }

    let referralCode = data.referral_code;
    if (data.id && !referralCode) {
      referralCode = buildPeskidsReferralCode({
        tenantId: TENANT_ID,
        leadId: data.id,
        email: String(lead.email),
      });
      const { error: referralUpdateError } = await supabase
        .schema('public')
        .from('leads')
        .update({ referral_code: referralCode })
        .eq('id', data.id);
      if (referralUpdateError) {
        console.warn('Failed to persist referral code:', referralUpdateError.message);
      }
    }

    const referredByCode = normalizeReferralCode(lead.referred_by_code);
    if (referredByCode) {
      const { data: referrerRows, error: referrerLookupError } = await supabase
        .schema('public')
        .from('leads')
        .select('id, referral_discount_cents, referral_redemptions')
        .eq('tenant_id', TENANT_ID)
        .eq('referral_code', referredByCode)
        .limit(1);
      if (!referrerLookupError && referrerRows?.[0]) {
        const referrer = referrerRows[0];
        const { error: referrerUpdateError } = await supabase
          .schema('public')
          .from('leads')
          .update({
            referral_discount_cents: (referrer.referral_discount_cents ?? 0) + PESKIDS_REFERRAL_DISCOUNT_CENTS,
            referral_redemptions: (referrer.referral_redemptions ?? 0) + 1,
          })
          .eq('id', referrer.id);
        if (referrerUpdateError) {
          console.warn('Failed to update referrer credit:', referrerUpdateError.message);
        }
      }
    }

    // Emit event to Opsly bus
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

    // Log webhook receipt
    await logWebhookReceipt('lead.created', webhook, data.id);

    return NextResponse.json({
      status: 'success',
      lead_id: data.id,
      referral_code: referralCode,
      referral_link: referralCode ? buildPeskidsReferralLink(referralCode) : null,
      message: 'Lead received. We will follow up shortly.',
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleFeedbackSubmission(webhook: any) {
  const supabase = supabaseServer();
  const feedback = extractFeedbackFromJelou(webhook);

  try {
    // Insert feedback into database
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

    if (error) {
      if (isMissingExpandedFeedbackColumn(error)) {
        const { data: legacyData, error: legacyError } = await supabase
          .schema('public')
          .from('feedback')
          .insert(legacyPayload)
          .select('id')
          .single();

        if (legacyError) {
          console.error('Database error inserting feedback:', legacyError);
          return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
        }

        await emitEvent('feedback.created', {
          feedback_id: legacyData.id,
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
            feedback_id: legacyData.id,
            severity: 'high',
            reason: 'Low satisfaction score',
          });
        }

        await logWebhookReceipt('feedback.created', webhook, legacyData.id);

        return NextResponse.json({
          status: 'success',
          feedback_id: legacyData.id,
          message: 'Thank you for your feedback!',
        });
      }

      console.error('Database error inserting feedback:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    // Emit event to Opsly bus
    await emitEvent('feedback.created', {
      feedback_id: data.id,
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

    // Alert admin if negative feedback
    if (feedback.satisfaction <= 2) {
      await emitEvent('feedback.alert', {
        feedback_id: data.id,
        severity: 'high',
        reason: 'Low satisfaction score',
      });
    }

    // Log webhook receipt
    await logWebhookReceipt('feedback.created', webhook, data.id);

    return NextResponse.json({
      status: 'success',
      feedback_id: data.id,
      message: 'Thank you for your feedback!',
    });
  } catch (error) {
    console.error('Feedback submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function logWebhookReceipt(
  event_type: string,
  webhook: any,
  record_id: string
) {
  try {
    const supabase = supabaseServer();
    await supabase.schema('public').from('webhook_logs').insert({
      tenant_id: TENANT_ID,
      provider: 'jelou',
      event_type,
      record_id,
      payload: webhook,
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to log webhook receipt:', error);
    // Don't fail the request if logging fails
  }
}
