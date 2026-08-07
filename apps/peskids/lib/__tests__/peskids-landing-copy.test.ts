import { describe, expect, it } from 'vitest';
import {
  PESKIDS_CONSENT_MARKETING,
  PESKIDS_CONSENT_TREATMENT,
  PESKIDS_FORM_CARD_DESCRIPTION,
  PESKIDS_FORM_CARD_TITLE,
  PESKIDS_FORM_SUBMIT_LABEL,
  PESKIDS_FORM_SUCCESS_NEXT,
  PESKIDS_RESERVATION_AUDIENCE,
  PESKIDS_RESERVATION_EYEBROW,
  PESKIDS_RESERVATION_TITLE,
  PESKIDS_WHATSAPP_CTA_LABEL,
} from '@/lib/peskids-landing-copy';

describe('peskids-landing-copy', () => {
  it('uses parent-facing contact/enrollment copy without internal tooling references', () => {
    const combined = [
      PESKIDS_RESERVATION_EYEBROW,
      PESKIDS_RESERVATION_TITLE,
      PESKIDS_RESERVATION_AUDIENCE,
      PESKIDS_FORM_CARD_TITLE,
      PESKIDS_FORM_CARD_DESCRIPTION,
      PESKIDS_FORM_SUBMIT_LABEL,
      PESKIDS_CONSENT_TREATMENT,
      PESKIDS_CONSENT_MARKETING,
      PESKIDS_WHATSAPP_CTA_LABEL,
    ].join(' ');

    expect(combined.toLowerCase()).not.toMatch(/jelou|demo|consultor|dashboard|admin flow/);
  });

  it('does not promise free trial class during soft-launch', () => {
    const combined = [
      PESKIDS_RESERVATION_TITLE,
      PESKIDS_RESERVATION_AUDIENCE,
      PESKIDS_FORM_CARD_TITLE,
      PESKIDS_FORM_SUBMIT_LABEL,
    ]
      .join(' ')
      .toLowerCase();

    expect(combined).not.toMatch(/gratis|gratuita|clase de prueba/);
  });

  it('explains form audience without repeating hero handoff bullets', () => {
    expect(PESKIDS_RESERVATION_AUDIENCE).toMatch(/familias/i);
    expect(PESKIDS_RESERVATION_AUDIENCE).toMatch(/profesores/i);
    expect(PESKIDS_RESERVATION_AUDIENCE).toMatch(/empresas/i);
    expect(PESKIDS_FORM_CARD_DESCRIPTION).toMatch(/1 minuto/i);
    expect(PESKIDS_FORM_CARD_DESCRIPTION.toLowerCase()).not.toMatch(
      /familias interesadas en ingresar/,
    );
  });

  it('uses WhatsApp CTA label after successful form submit', () => {
    expect(PESKIDS_WHATSAPP_CTA_LABEL).toBe('Continuar por WhatsApp');
  });

  it('tells the client to send the message so support can validate', () => {
    expect(PESKIDS_FORM_SUCCESS_NEXT).toMatch(/WhatsApp/i);
    expect(PESKIDS_FORM_SUCCESS_NEXT).toMatch(/validar/i);
    expect(PESKIDS_FORM_SUCCESS_NEXT.toLowerCase()).not.toMatch(/admin/);
  });
});
