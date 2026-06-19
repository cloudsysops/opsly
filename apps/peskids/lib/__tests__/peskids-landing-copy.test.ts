import { describe, expect, it } from 'vitest';
import {
  PESKIDS_CONSENT_MARKETING,
  PESKIDS_CONSENT_TREATMENT,
  PESKIDS_FORM_CARD_TITLE,
  PESKIDS_RESERVATION_BULLETS,
  PESKIDS_RESERVATION_EYEBROW,
  PESKIDS_RESERVATION_TITLE,
  PESKIDS_WHATSAPP_CTA_LABEL,
} from '@/lib/peskids-landing-copy';

describe('peskids-landing-copy', () => {
  it('uses parent-facing reservation copy without internal tooling references', () => {
    const combined = [
      PESKIDS_RESERVATION_EYEBROW,
      PESKIDS_RESERVATION_TITLE,
      PESKIDS_FORM_CARD_TITLE,
      PESKIDS_CONSENT_TREATMENT,
      PESKIDS_CONSENT_MARKETING,
      PESKIDS_WHATSAPP_CTA_LABEL,
      ...PESKIDS_RESERVATION_BULLETS,
    ].join(' ');

    expect(combined.toLowerCase()).not.toMatch(/jelou|demo|consultor|dashboard|admin flow/);
  });

  it('includes required reservation bullets', () => {
    expect(PESKIDS_RESERVATION_BULLETS).toHaveLength(3);
    expect(PESKIDS_RESERVATION_BULLETS[2]).toContain('48 horas');
  });

  it('uses WhatsApp CTA label requested for parents', () => {
    expect(PESKIDS_WHATSAPP_CTA_LABEL).toBe('Prefiero WhatsApp');
  });
});
