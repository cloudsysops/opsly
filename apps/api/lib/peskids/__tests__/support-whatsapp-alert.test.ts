import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchPeskidsSupportWhatsAppAlert } from '../support-whatsapp-alert';
import type { PeskidsLeadRow } from '../repository';

const lead: PeskidsLeadRow = {
  id: 'lead-1',
  tenant_slug: 'peskids',
  full_name: 'Doris Pinilla',
  email: 'doris@example.com',
  phone: '+573117460548',
  lead_type: 'family',
  service_mode: 'domicilio',
  class_modality: 'domicilio',
  neighborhood: 'Poblado',
  grade_interested: 'Other',
  child_name: 'Emilio Vieira Angel',
  birth_date: '2020-05-12',
  document_type: 'CC',
  document_number: 'encrypted-value',
  company_name: null,
  company_nit: null,
  referral_source: 'web',
  status: 'new',
  admin_notes: null,
  metadata: null,
  created_at: '2026-09-06T12:00:00.000Z',
};

describe('dispatchPeskidsSupportWhatsAppAlert', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED = 'true';
    process.env.PESKIDS_SUPPORT_WHATSAPP = '+573001112233';
    process.env.N8N_WEBHOOK_BASE_URL = 'https://n8n.example.com/webhook';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.PESKIDS_HOT_LEAD_ALERTS_ENABLED;
    delete process.env.PESKIDS_SUPPORT_WHATSAPP;
    delete process.env.N8N_WEBHOOK_BASE_URL;
  });

  it('sends a support alert with a lead link and without the document number', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('{}', { status: 202 }));

    const result = await dispatchPeskidsSupportWhatsAppAlert(lead);

    expect(result).toMatchObject({ ok: true, status: 'sent' });
    expect(fetch).toHaveBeenCalledWith(
      'https://n8n.example.com/webhook/peskids-notify',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0]?.[1]?.body));
    expect(body).toMatchObject({
      type: 'lead_created_support',
      to: '+573001112233',
      metadata: { lead_id: 'lead-1' },
    });
    expect(body.body).toContain('Emilio Vieira Angel');
    expect(body.body).toContain('/admin/interesados/lead-1');
    expect(body.body).not.toContain('encrypted-value');
  });

  it('fails closed when the support number is not configured', async () => {
    delete process.env.PESKIDS_SUPPORT_WHATSAPP;

    const result = await dispatchPeskidsSupportWhatsAppAlert(lead);

    expect(result).toMatchObject({ ok: false, status: 'failed' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
