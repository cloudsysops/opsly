/** Source/campaign mapping for public reservation landing routes. */
export const PESKIDS_HOME_LANDING = {
  source: 'website',
  campaign: 'home-reservation',
} as const;

export const PESKIDS_INSTAGRAM_LANDING = {
  source: 'instagram-pilot',
  campaign: 'instagram-pilot',
  defaultReferralSource: 'Instagram',
} as const;

export const PESKIDS_RESERVATION_ANCHOR = 'reserva';

/** Anchor id + href for the public lead capture form (form-before-WhatsApp policy). */
export const PESKIDS_RESERVATION_FORM_ANCHOR = 'reserva-form';
export const PESKIDS_RESERVATION_FORM_HREF = `/#${PESKIDS_RESERVATION_FORM_ANCHOR}`;
