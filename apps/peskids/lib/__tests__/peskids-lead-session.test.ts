import { describe, expect, it } from 'vitest';
import {
  buildPostLeadWhatsAppPrefill,
  parsePeskidsLeadSession,
  PESKIDS_LEAD_SESSION_KEY,
} from '@/lib/peskids-lead-session';

describe('peskids-lead-session', () => {
  it('buildPostLeadWhatsAppPrefill includes the lead name', () => {
    expect(buildPostLeadWhatsAppPrefill('María García')).toContain('María García');
    expect(buildPostLeadWhatsAppPrefill('María García')).toContain('formulario de matrícula');
  });

  it('parsePeskidsLeadSession accepts valid JSON', () => {
    const raw = JSON.stringify({ name: 'Ana López', capturedAt: '2026-06-09T12:00:00.000Z' });
    expect(parsePeskidsLeadSession(raw)).toEqual({
      name: 'Ana López',
      capturedAt: '2026-06-09T12:00:00.000Z',
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
