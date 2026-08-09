import { describe, expect, it } from 'vitest';
import {
  assertNoForbiddenNavPaths,
  createIcsoAgencyProfile,
  createTenantMissionControlProfile,
  healthFromLifecycleStatus,
  isNavActive,
  omitMrrUntilCommercialSource,
  redactPiiFromNotes,
  sanitizeEntityCard,
  safeParseMissionControlProfile,
} from '../src/index.js';

describe('mission-control-kit', () => {
  it('builds ICSO agency profile', () => {
    const profile = createIcsoAgencyProfile();
    expect(profile.mode).toBe('agency');
    expect(profile.tenantSlug).toBe('intcloudsysops');
    expect(profile.basePath).toBe('/mission-control');
    expect(profile.features.pipeline).toBe(true);
    expect(profile.dataBoundaries).toContain('peskids-leads');
  });

  it('scaffolds tenant profile without inventing ventures', () => {
    const profile = createTenantMissionControlProfile({
      tenantSlug: 'acme-swim',
      productName: 'Acme Swim MC',
      shortName: 'Acme',
    });
    expect(profile.mode).toBe('tenant');
    expect(profile.id).toBe('acme-swim');
    expect(profile.features.catalog).toBe(false);
  });

  it('omits MRR as PROYECTADO', () => {
    const mrr = omitMrrUntilCommercialSource();
    expect(mrr.value).toBeNull();
    expect(mrr.confidence).toBe('PROYECTADO');
  });

  it('sanitizes cards without email fields', () => {
    const card = sanitizeEntityCard({
      id: '1',
      title: 'Lead Co',
      status: 'prospecting',
      email: 'secret@example.com',
    });
    expect(card).not.toHaveProperty('email');
    expect(JSON.stringify(card)).not.toContain('secret@');
  });

  it('redacts PII in notes', () => {
    const out = redactPiiFromNotes('Call me +57 300 123 4567 or a@b.co please');
    expect(out).toContain('[phone]');
    expect(out).toContain('[email]');
  });

  it('maps deal stages to health tones', () => {
    expect(healthFromLifecycleStatus('won').tone).toBe('healthy');
    expect(healthFromLifecycleStatus('lost').tone).toBe('critical');
    expect(healthFromLifecycleStatus('prospecting').tone).toBe('warning');
  });

  it('nav active helper respects basePath', () => {
    expect(isNavActive('/mission-control', '/mission-control', '/mission-control')).toBe(true);
    expect(isNavActive('/mission-control/pipeline', '/mission-control/pipeline', '/mission-control')).toBe(
      true
    );
  });

  it('rejects forbidden nav fragments', () => {
    const profile = createIcsoAgencyProfile();
    expect(() => assertNoForbiddenNavPaths(profile.nav, ['interesados'])).not.toThrow();
    expect(() =>
      assertNoForbiddenNavPaths(
        [{ title: 'x', items: [{ href: '/admin/interesados', label: 'bad' }] }],
        ['interesados']
      )
    ).toThrow(/interesados/);
  });

  it('safeParse rejects invalid profiles', () => {
    const bad = safeParseMissionControlProfile({ id: '' });
    expect(bad.ok).toBe(false);
  });
});
