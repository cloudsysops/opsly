import { describe, expect, it } from 'vitest';
import { isPeskidsPublicLandingPath } from '@/lib/marketing-routes';

describe('isPeskidsPublicLandingPath', () => {
  it('matches public marketing routes', () => {
    expect(isPeskidsPublicLandingPath('/')).toBe(true);
    expect(isPeskidsPublicLandingPath('/instagram')).toBe(true);
    expect(isPeskidsPublicLandingPath('/reserva-clase-gratuita')).toBe(true);
  });

  it('excludes authenticated portals', () => {
    expect(isPeskidsPublicLandingPath('/familias')).toBe(false);
    expect(isPeskidsPublicLandingPath('/admin/login')).toBe(false);
    expect(isPeskidsPublicLandingPath('/teacher/dashboard')).toBe(false);
  });
});
