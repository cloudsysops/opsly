import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildWhatsAppUrl,
  normalizeWhatsAppE164,
  resolveWhatsAppChannel,
} from '@/lib/contact-channels';
import {
  buildPostLeadWhatsAppPrefill,
  parsePeskidsLeadSession,
} from '@/lib/peskids-lead-session';

describe('contact-channels modality routing', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('normalizeWhatsAppE164 strips non-digits', () => {
    expect(normalizeWhatsAppE164('+57 300 123 4567')).toBe('573001234567');
  });

  it('resolveWhatsAppChannel maps modalities', () => {
    expect(resolveWhatsAppChannel('domicilio')).toBe('domicilio');
    expect(resolveWhatsAppChannel('llanogrande')).toBe('llanogrande');
    expect(resolveWhatsAppChannel(null)).toBe('default');
  });

  it('buildWhatsAppUrl uses domicilio number when modality is domicilio', () => {
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_WHATSAPP_E164', '573111111111');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_E164', '573222222222');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_E164', '573333333333');
    const url = buildWhatsAppUrl({ modality: 'domicilio', prefill: 'hola' });
    expect(url).toContain('wa.me/573222222222');
    expect(url).toContain('text=hola');
  });

  it('buildWhatsAppUrl uses llanogrande number when modality is llanogrande', () => {
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_WHATSAPP_E164', '573111111111');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_WHATSAPP_DOMICILIO_E164', '573222222222');
    vi.stubEnv('NEXT_PUBLIC_PESKIDS_WHATSAPP_LLANOGRANDE_E164', '573333333333');
    const url = buildWhatsAppUrl({ modality: 'llanogrande', prefill: 'hola' });
    expect(url).toContain('wa.me/573333333333');
  });
});

describe('peskids-lead-session', () => {
  it('buildPostLeadWhatsAppPrefill includes modality and support lead link', () => {
    const text = buildPostLeadWhatsAppPrefill('Ana', {
      class_modality: 'domicilio',
      lead_type: 'family',
      phone: '3009998877',
      lead_id: 'lead-9',
      siteBaseUrl: 'https://www.peskids.com',
    });
    expect(text).toContain('Ana');
    expect(text).toContain('Clases a domicilio');
    expect(text).toContain('3009998877');
    expect(text).toContain('/admin/interesados/lead-9');
  });

  it('parsePeskidsLeadSession keeps class_modality and lead_id', () => {
    const session = parsePeskidsLeadSession(
      JSON.stringify({
        name: 'Ana',
        capturedAt: '2026-07-22T00:00:00.000Z',
        class_modality: 'llanogrande',
        lead_type: 'family',
        lead_id: 'lead-42',
        email: 'ana@example.com',
      })
    );
    expect(session?.class_modality).toBe('llanogrande');
    expect(session?.lead_type).toBe('family');
    expect(session?.lead_id).toBe('lead-42');
    expect(session?.email).toBe('ana@example.com');
  });
});
