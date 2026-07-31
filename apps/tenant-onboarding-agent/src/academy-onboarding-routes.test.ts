import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerAcademyOnboardingRoutes } from './academy-onboarding-routes.js';

describe('POST /onboard/academy/preview', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = Fastify();
    registerAcademyOnboardingRoutes(app);
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns a validated preview for a new tenant', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/onboard/academy/preview',
      payload: {
        slug: 'swim-cali',
        displayName: 'Swim Cali',
        domain: 'https://www.swimcali.com',
        ownerEmail: 'owner@swimcali.com',
        franchises: { primarySlug: 'swim-cali-principal' },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.instance.tenant.slug).toBe('swim-cali');
    expect(body.tenantConfig.tenant_slug).toBe('swim-cali');
    expect(body.seedFiles['tenant-settings.json']).toBeDefined();
    expect(body.checklist.totalMinutes).toBeGreaterThan(0);
    expect(body.note).toMatch(/preview/i);
  });

  it('rejects an invalid slug', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/onboard/academy/preview',
      payload: {
        slug: 'Not_A_Slug',
        displayName: 'Swim Cali',
        domain: 'https://www.swimcali.com',
        ownerEmail: 'owner@swimcali.com',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a missing required field', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/onboard/academy/preview',
      payload: { slug: 'swim-cali', displayName: 'Swim Cali' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('conflicts on a slug that already has a tenant config', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/onboard/academy/preview',
      payload: {
        slug: 'peskids',
        displayName: 'Peskids',
        domain: 'https://www.peskids.com',
        ownerEmail: 'owner@peskids.com',
      },
    });
    expect(res.statusCode).toBe(409);
  });
});
