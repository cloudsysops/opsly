import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { emitEvent } from '@/lib/events';
import type { Json } from '@/lib/types';
import {
  verifyJelouSignature,
  parseJelouWebhook,
  extractLeadFromJelou,
  extractFeedbackFromJelou,
  type JelouWebhookPayload,
} from '@/lib/jelou';

const JELOU_WEBHOOK_SECRET = process.env.JELOU_WEBHOOK_SECRET || 'dev-secret';
const TENANT_ID = process.env.PESKIDS_TENANT_ID || 'peskids-mvp';

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

async function handleLeadSubmission(webhook: JelouWebhookPayload) {
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
        grade_interested: String(lead.interested_grade),
        referral_source: lead.source,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error inserting lead:', error);
      return NextResponse.json({ error: 'Failed to save lead' }, { status: 500 });
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
    });

    // Log webhook receipt
    await logWebhookReceipt('lead.created', webhook, data.id);

    return NextResponse.json({
      status: 'success',
      lead_id: data.id,
      message: 'Lead received. We will follow up shortly.',
    });
  } catch (error) {
    console.error('Lead submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleFeedbackSubmission(webhook: JelouWebhookPayload) {
  const supabase = supabaseServer();
  const feedback = extractFeedbackFromJelou(webhook);

  try {
    // Insert feedback into database
    const { data, error } = await supabase
      .schema('public')
      .from('feedback')
      .insert({
        tenant_id: TENANT_ID,
        child_name: String(feedback.student_name),
        satisfaction: feedback.satisfaction,
        suggestion: feedback.suggestion ? String(feedback.suggestion) : null,
        contact_wanted: feedback.follow_up_wanted,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error inserting feedback:', error);
      return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
    }

    // Emit event to Opsly bus
    await emitEvent('feedback.created', {
      feedback_id: data.id,
      student_name: feedback.student_name,
      satisfaction: feedback.satisfaction,
      suggestion: feedback.suggestion,
      follow_up_wanted: feedback.follow_up_wanted,
      channel: feedback.channel,
      contact_id: feedback.contact_id,
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
  webhook: JelouWebhookPayload,
  record_id: string
) {
  try {
    const supabase = supabaseServer();
    await supabase.schema('public').from('webhook_logs').insert({
      tenant_id: TENANT_ID,
      provider: 'jelou',
      event_type,
      record_id,
      payload: webhook as unknown as Json,
      received_at: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to log webhook receipt:', error);
    // Don't fail the request if logging fails
  }
}
