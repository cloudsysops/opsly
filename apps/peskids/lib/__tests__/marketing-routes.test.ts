import { describe, expect, it } from 'vitest';
import { isPeskidsPublicLandingPath } from '@/lib/marketing-routes';

describe('isPeskidsPublicLandingPath', () => {
  it('matches public marketing routes without embedded chat', () => {
    expect(isPeskidsPublicLandingPath('/')).toBe(true);
    expect(isPeskidsPublicLandingPath('/instagram')).toBe(true);
    expect(isPeskidsPublicLandingPath('/reserva-clase-gratuita')).toBe(true);
    expect(isPeskidsPublicLandingPath('/familias')).toBe(true);
    expect(isPeskidsPublicLandingPath('/familias/login')).toBe(true);
  });

  it('excludes authenticated portals', () => {
    expect(isPeskidsPublicLandingPath('/admin/login')).toBe(false);
    expect(isPeskidsPublicLandingPath('/teacher/dashboard')).toBe(false);
    expect(isPeskidsPublicLandingPath('/familias/dashboard')).toBe(false);
  });
});
