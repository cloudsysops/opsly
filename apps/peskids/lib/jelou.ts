/**
 * Jelou Integration
 * Handles multi-channel form submissions via Jelou (WhatsApp, SMS, email)
 * https://jelou.ai
 */

export interface JelouWebhookPayload {
  event: string;
  timestamp: string;
  data: {
    form_id?: string;
    form_name?: string;
    contact_id?: string;
    channel?: 'whatsapp' | 'sms' | 'email' | 'web';
    fields: Record<string, string | number | boolean>;
    [key: string]: unknown;
  };
}

export interface JelouFormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea';
  required?: boolean;
  validation?: string;
}

/**
 * Verify Jelou webhook signature
 * Jelou signs webhooks with X-Jelou-Signature header
 */
export function verifyJelouSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Parse incoming Jelou webhook
 */
export function parseJelouWebhook(rawPayload: unknown): JelouWebhookPayload {
  const payload = rawPayload as Record<string, unknown>;

  if (!payload.event || !payload.data) {
    throw new Error('Invalid Jelou webhook: missing event or data');
  }

  return {
    event: payload.event as string,
    timestamp: payload.timestamp as string || new Date().toISOString(),
    data: payload.data as JelouWebhookPayload['data'],
  };
}

/**
 * Extract lead data from Jelou form submission
 */
export function extractLeadFromJelou(webhook: JelouWebhookPayload) {
  const { fields } = webhook.data;

  return {
    name: fields.name || fields.full_name || '',
    email: fields.email || '',
    phone: fields.phone || fields.phone_number || '',
    interested_grade: fields.grade || fields.interested_grade || '',
    source: `jelou:${webhook.data.channel || 'web'}`,
    contact_id: webhook.data.contact_id,
    raw_payload: webhook,
  };
}

/**
 * Extract feedback data from Jelou form submission
 */
export function extractFeedbackFromJelou(webhook: JelouWebhookPayload) {
  const { fields } = webhook.data;

  return {
    student_name: fields.student_name || fields.child_name || '',
    satisfaction: parseInt(String(fields.satisfaction ?? fields.rating ?? '3'), 10),
    suggestion: fields.suggestion || fields.feedback || fields.notes || '',
    follow_up_wanted: fields.follow_up === 'yes' || fields.follow_up === true,
    contact_id: webhook.data.contact_id,
    channel: webhook.data.channel,
    raw_payload: webhook,
  };
}

/**
 * Format data for Jelou send (reply to user)
 */
export function formatJelouReply(message: string, contactId: string) {
  return {
    contact_id: contactId,
    message: message,
    channel: 'auto', // Jelou sends to the channel the user contacted from
  };
}
