import { describe, expect, it } from 'vitest';
import {
  isPeskidsPublicLandingPath,
  peskidsAdmissionsChatFormRedirectPayload,
} from '@/lib/marketing-routes';

describe('isPeskidsPublicLandingPath', () => {
  it('matches public marketing routes without embedded chat', () => {
    expect(isPeskidsPublicLandingPath('/')).toBe(true);
    expect(isPeskidsPublicLandingPath('/instagram')).toBe(true);
    expect(isPeskidsPublicLandingPath('/reserva-clase-gratuita')).toBe(true);
    expect(isPeskidsPublicLandingPath('/familias')).toBe(true);
    expect(isPeskidsPublicLandingPath('/familias/login')).toBe(true);
    expect(isPeskidsPublicLandingPath('/privacy')).toBe(true);
    expect(isPeskidsPublicLandingPath('/terms')).toBe(true);
    expect(isPeskidsPublicLandingPath('/cookies')).toBe(true);
    expect(isPeskidsPublicLandingPath('/aviso-parental')).toBe(true);
    expect(isPeskidsPublicLandingPath('/dsar')).toBe(true);
  });

  it('excludes authenticated portals', () => {
    expect(isPeskidsPublicLandingPath('/admin/login')).toBe(false);
    expect(isPeskidsPublicLandingPath('/teacher/dashboard')).toBe(false);
    expect(isPeskidsPublicLandingPath('/familias/dashboard')).toBe(false);
    expect(isPeskidsPublicLandingPath('/familias/submissions')).toBe(false);
  });
});

describe('peskidsAdmissionsChatFormRedirectPayload', () => {
  it('keeps legacy form payload for older clients', () => {
    const payload = peskidsAdmissionsChatFormRedirectPayload();
    expect(payload.stage).toBe('form_required');
    expect(payload.reply).toContain('chat');
    expect(payload.reply).toContain('/#reserva-form');
  });
});
