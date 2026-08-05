import { describe, expect, it } from 'vitest';
import {
  buildAdminLeadValidationUrl,
  buildPostLeadWhatsAppPrefill,
  parsePeskidsLeadSession,
  PESKIDS_LEAD_SESSION_KEY,
} from '@/lib/peskids-lead-session';

describe('peskids-lead-session', () => {
  it('buildPostLeadWhatsAppPrefill includes the lead name and form summary', () => {
    const text = buildPostLeadWhatsAppPrefill('María García', {
      lead_type: 'family',
      class_modality: 'llanogrande',
      email: 'maria@example.com',
      phone: '3001234567',
      child_name: 'Sofía',
      grade_interested: 'K-5',
      lead_id: 'lead-abc',
      siteBaseUrl: 'https://www.peskids.com',
    });
    expect(text).toContain('María García');
    expect(text).toContain('formulario de solicitud');
    expect(text).toContain('Resumen de mi solicitud');
    expect(text).toContain('maria@example.com');
    expect(text).toContain('3001234567');
    expect(text).toContain('Sofía');
    expect(text).toContain('Sede Llanogrande');
    expect(text).toContain('https://www.peskids.com/admin/interesados/lead-abc');
  });

  it('buildAdminLeadValidationUrl uses interesados path', () => {
    expect(buildAdminLeadValidationUrl('uuid-1', 'https://www.peskids.com')).toBe(
      'https://www.peskids.com/admin/interesados/uuid-1'
    );
  });

  it('parsePeskidsLeadSession accepts valid JSON', () => {
    const raw = JSON.stringify({ name: 'Ana López', capturedAt: '2026-06-09T12:00:00.000Z' });
    expect(parsePeskidsLeadSession(raw)).toEqual({
      name: 'Ana López',
      capturedAt: '2026-06-09T12:00:00.000Z',
      class_modality: null,
      lead_type: null,
      lead_id: null,
      email: null,
      phone: null,
      child_name: null,
      neighborhood: null,
      grade_interested: null,
      company_name: null,
    });
  });

  it('parsePeskidsLeadSession rejects invalid payloads', () => {
    expect(parsePeskidsLeadSession(null)).toBeNull();
    expect(parsePeskidsLeadSession('')).toBeNull();
    expect(parsePeskidsLeadSession('not-json')).toBeNull();
    expect(parsePeskidsLeadSession(JSON.stringify({ name: 'A' }))).toBeNull();
    expect(parsePeskidsLeadSession(JSON.stringify({ capturedAt: 'x' }))).toBeNull();
  });

  it('exports a stable session storage key', () => {
    expect(PESKIDS_LEAD_SESSION_KEY).toBe('peskids_public_lead');
  });
});
