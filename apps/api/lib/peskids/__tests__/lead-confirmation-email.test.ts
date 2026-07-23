import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchPeskidsLeadConfirmationEmail } from '../lead-confirmation-email';
import type { PeskidsLeadRow } from '../repository';

vi.mock('../../email', () => ({
  escapeHtml: (value: string) => value,
  sendHtmlEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lead-confirmation-repository', () => ({
  findLeadEmailDeliveryByKey: vi.fn(),
  insertPendingLeadEmailDelivery: vi.fn(),
  updateLeadEmailDeliveryStatus: vi.fn(),
}));

import { sendHtmlEmail } from '../../email';
import * as deliveryRepo from '../lead-confirmation-repository';

const sampleLead: PeskidsLeadRow = {
  id: 'lead-confirm-1',
  tenant_slug: 'peskids',
  full_name: 'Ana Pérez',
  email: 'ana@example.com',
  phone: '+573001112233',
  class_modality: 'llanogrande',
  neighborhood: 'El Retiro',
  grade_interested: 'K-5',
  referral_source: 'instagram',
  status: 'new',
  admin_notes: null,
  created_at: '2026-07-22T12:00:00.000Z',
};

describe('dispatchPeskidsLeadConfirmationEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED;
  });

  afterEach(() => {
    delete process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED;
  });

  it('skips when confirmation flag is off (default)', async () => {
    const result = await dispatchPeskidsLeadConfirmationEmail(sampleLead);
    expect(result).toMatchObject({
      ok: true,
      status: 'skipped',
      idempotency_key: 'lead-confirmation:lead-confirm-1',
    });
    expect(sendHtmlEmail).not.toHaveBeenCalled();
    expect(deliveryRepo.findLeadEmailDeliveryByKey).not.toHaveBeenCalled();
  });

  it('sends once and marks delivery sent when flag is on', async () => {
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'true';
    vi.mocked(deliveryRepo.findLeadEmailDeliveryByKey).mockResolvedValue(null);
    vi.mocked(deliveryRepo.insertPendingLeadEmailDelivery).mockResolvedValue({
      id: 'delivery-1',
      tenant_slug: 'peskids',
      lead_id: sampleLead.id,
      email_type: 'lead_confirmation',
      idempotency_key: 'lead-confirmation:lead-confirm-1',
      status: 'pending',
      to_email: sampleLead.email,
      provider_message_id: null,
      error_detail: null,
      created_at: sampleLead.created_at,
      updated_at: sampleLead.created_at,
      sent_at: null,
    });

    const result = await dispatchPeskidsLeadConfirmationEmail(sampleLead);
    expect(result).toMatchObject({ ok: true, status: 'sent' });
    expect(sendHtmlEmail).toHaveBeenCalledTimes(1);
    expect(sendHtmlEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ana@example.com',
        subject: 'Recibimos tu interés en Peskids',
      })
    );
    expect(deliveryRepo.updateLeadEmailDeliveryStatus).toHaveBeenCalledWith({
      id: 'delivery-1',
      status: 'sent',
    });
  });

  it('idempotently skips when delivery already sent', async () => {
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'true';
    vi.mocked(deliveryRepo.findLeadEmailDeliveryByKey).mockResolvedValue({
      id: 'delivery-1',
      tenant_slug: 'peskids',
      lead_id: sampleLead.id,
      email_type: 'lead_confirmation',
      idempotency_key: 'lead-confirmation:lead-confirm-1',
      status: 'sent',
      to_email: sampleLead.email,
      provider_message_id: null,
      error_detail: null,
      created_at: sampleLead.created_at,
      updated_at: sampleLead.created_at,
      sent_at: sampleLead.created_at,
    });

    const result = await dispatchPeskidsLeadConfirmationEmail(sampleLead);
    expect(result.status).toBe('already_sent');
    expect(sendHtmlEmail).not.toHaveBeenCalled();
  });

  it('marks failed when Resend throws and does not rethrow', async () => {
    process.env.PESKIDS_LEAD_CONFIRMATION_ENABLED = 'true';
    vi.mocked(deliveryRepo.findLeadEmailDeliveryByKey)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'delivery-2',
        tenant_slug: 'peskids',
        lead_id: sampleLead.id,
        email_type: 'lead_confirmation',
        idempotency_key: 'lead-confirmation:lead-confirm-1',
        status: 'pending',
        to_email: sampleLead.email,
        provider_message_id: null,
        error_detail: null,
        created_at: sampleLead.created_at,
        updated_at: sampleLead.created_at,
        sent_at: null,
      });
    vi.mocked(deliveryRepo.insertPendingLeadEmailDelivery).mockResolvedValue({
      id: 'delivery-2',
      tenant_slug: 'peskids',
      lead_id: sampleLead.id,
      email_type: 'lead_confirmation',
      idempotency_key: 'lead-confirmation:lead-confirm-1',
      status: 'pending',
      to_email: sampleLead.email,
      provider_message_id: null,
      error_detail: null,
      created_at: sampleLead.created_at,
      updated_at: sampleLead.created_at,
      sent_at: null,
    });
    vi.mocked(sendHtmlEmail).mockRejectedValueOnce(new Error('resend down'));

    const result = await dispatchPeskidsLeadConfirmationEmail(sampleLead);
    expect(result).toMatchObject({ ok: false, status: 'failed', detail: 'resend down' });
    expect(deliveryRepo.updateLeadEmailDeliveryStatus).toHaveBeenCalledWith({
      id: 'delivery-2',
      status: 'failed',
      error_detail: 'resend down',
    });
  });
});
