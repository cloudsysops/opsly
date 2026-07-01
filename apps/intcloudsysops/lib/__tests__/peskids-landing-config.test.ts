import { describe, expect, it } from 'vitest';
import {
  PESKIDS_HOME_LANDING,
  PESKIDS_INSTAGRAM_LANDING,
  PESKIDS_RESERVATION_ANCHOR,
} from '@/lib/peskids-landing-config';

describe('peskids landing config', () => {
  it('maps home reservation source and campaign', () => {
    expect(PESKIDS_HOME_LANDING).toEqual({
      source: 'website',
      campaign: 'home-reservation',
    });
  });

  it('maps instagram pilot source and campaign', () => {
    expect(PESKIDS_INSTAGRAM_LANDING.source).toBe('instagram-pilot');
    expect(PESKIDS_INSTAGRAM_LANDING.campaign).toBe('instagram-pilot');
    expect(PESKIDS_INSTAGRAM_LANDING.defaultReferralSource).toBe('Instagram');
  });

  it('uses stable reservation anchor id', () => {
    expect(PESKIDS_RESERVATION_ANCHOR).toBe('reserva');
  });
});
