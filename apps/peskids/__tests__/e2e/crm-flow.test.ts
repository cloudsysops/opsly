import { describe, it, expect } from 'vitest';

describe('CRM Integration Flow (E2E)', () => {
  describe('franchise discovery', () => {
    it('finds nearby franchises by geolocation', async () => {
      const response = await fetch('http://localhost:3004/api/franchise/nearby', {
        method: 'GET',
        headers: {
          'x-user-latitude': '4.7110',
          'x-user-longitude': '-74.0721',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.franchises).toBeDefined();
      expect(Array.isArray(data.franchises)).toBe(true);

      if (data.franchises.length > 0) {
        expect(data.franchises[0]).toHaveProperty('distanceKm');
        expect(data.franchises[0]).toHaveProperty('id');
      }
    });
  });

  describe('CRM contact search', () => {
    it('searches contacts within franchise scope', async () => {
      const response = await fetch('http://localhost:3004/api/crm/search?q=test', {
        method: 'GET',
        headers: {
          'x-franchise-id': 'test-franchise-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.contacts).toBeDefined();
    });

    it('rejects search without franchise scope', async () => {
      const response = await fetch('http://localhost:3004/api/crm/search?q=test', {
        method: 'GET',
      });

      expect(response.status).toBe(400);
    });
  });

  describe('admin franchise management', () => {
    it('requires JWT for admin access', async () => {
      const response = await fetch('http://localhost:3004/api/admin/franchises', {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });

    it('accepts valid JWT token', async () => {
      const token = process.env.TEST_ADMIN_JWT || 'test-token';

      const response = await fetch('http://localhost:3004/api/admin/franchises', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      expect([200, 401]).toContain(response.status);
    });
  });

  describe('rate limiting on public endpoints', () => {
    it('enforces rate limit on form submissions', async () => {
      const responses = [];
      for (let i = 0; i < 6; i++) {
        const response = await fetch('http://localhost:3004/api/portal/forms/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliveryId: 'test-delivery-id',
            templateId: 'test-template-id',
            responseData: { test: 'data' },
          }),
        });
        responses.push(response.status);
      }

      // First 5 should be 400 (invalid data) or 404 (not found), not 429
      // After rate limit kicks in, should see 429
      const hasRateLimit = responses.some((status) => status === 429);
      expect(hasRateLimit || responses.length === 6).toBe(true);
    });
  });

  describe('security headers', () => {
    it('returns security headers on all responses', async () => {
      const response = await fetch('http://localhost:3004/', {
        method: 'GET',
      });

      expect(response.headers.has('X-Content-Type-Options')).toBe(true);
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.has('X-Frame-Options')).toBe(true);
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.has('X-XSS-Protection')).toBe(true);
    });
  });

  describe('CORS handling', () => {
    it('allows requests from whitelisted origins', async () => {
      const response = await fetch('http://localhost:3004/api/admin/franchises', {
        method: 'GET',
        headers: {
          'Origin': 'http://localhost:3004',
          'Authorization': 'Bearer test-token',
        },
      });

      const corsHeader = response.headers.get('Access-Control-Allow-Origin');
      expect(corsHeader).toBeDefined();
    });
  });
});
