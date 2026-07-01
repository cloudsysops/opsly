import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GhlHealthService, type GhlHealthStatus } from '../ghl-health.service';
import type { PeskidsGoHighLevelThreadClient } from '@/lib/gohighlevel-thread-client';

function createMockClient(overrides: Partial<{
  listTagsThrows: boolean;
  createContactThrows: boolean;
  getContactsThrows: boolean;
  rateLimitRemaining: number | null;
  rateLimitReset: string | null;
}> = {}): PeskidsGoHighLevelThreadClient {
  const mockClient = {
    listTags: vi.fn().mockImplementation(async () => {
      if (overrides.listTagsThrows) throw new Error('API error');
      return [{ id: 'tag-1', name: 'lead-web' }];
    }),
    createContact: vi.fn().mockImplementation(async (data: { email?: string }) => {
      if (overrides.createContactThrows) throw new Error('Create failed');
      return { id: 'contact-health-1', name: 'Test', email: data.email };
    }),
    getContacts: vi.fn().mockImplementation(async () => {
      if (overrides.getContactsThrows) throw new Error('Contacts error');
      return { data: [], total: 0 };
    }),
    searchConversations: vi.fn().mockResolvedValue({ conversations: [], total: 0 }),
    addContactTags: vi.fn().mockResolvedValue(undefined),
    deleteContact: vi.fn().mockResolvedValue(undefined),
    getLastRateLimitInfo: vi.fn().mockReturnValue({
      remaining: overrides.rateLimitRemaining ?? 100,
      resetAt: overrides.rateLimitReset ?? new Date(Date.now() + 60000).toISOString(),
    }),
  } as unknown as PeskidsGoHighLevelThreadClient;

  return mockClient;
}

describe('GhlHealthService', () => {
  let service: GhlHealthService;

  describe('healthy scenario', () => {
    beforeEach(() => {
      const client = createMockClient();
      service = new GhlHealthService(client);
    });

    it('returns healthy overall status', async () => {
      const result = await service.checkHealth();
      expect(result.overall).toBe('healthy');
    });

    it('reports auth valid and API accessible', async () => {
      const result = await service.checkHealth();
      expect(result.authValid).toBe(true);
      expect(result.apiAccessible).toBe(true);
    });

    it('reports contact creation works', async () => {
      const result = await service.checkHealth();
      expect(result.contactCreationWorks).toBe(true);
    });

    it('reports pipeline accessible', async () => {
      const result = await service.checkHealth();
      expect(result.pipelineAccessible).toBe(true);
    });

    it('includes latency measurement', async () => {
      const result = await service.checkHealth();
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.lastCheck).toBe('string');
    });

    it('includes rate limit info', async () => {
      const result = await service.checkHealth();
      expect(result.rateLimitRemaining).toBe(100);
      expect(result.rateLimitReset).toBeTruthy();
    });
  });

  describe('auth failure scenario', () => {
    beforeEach(() => {
      const client = createMockClient({ listTagsThrows: true });
      service = new GhlHealthService(client);
    });

    it('returns degraded overall status', async () => {
      const result = await service.checkHealth();
      expect(result.overall).toBe('degraded');
    });

    it('reports auth invalid', async () => {
      const result = await service.checkHealth();
      expect(result.authValid).toBe(false);
      expect(result.apiAccessible).toBe(false);
    });
  });

  describe('rate limit scenario', () => {
    beforeEach(() => {
      const client = createMockClient({ rateLimitRemaining: 5 });
      service = new GhlHealthService(client);
    });

    it('reports low rate limit remaining', async () => {
      const result = await service.checkHealth();
      expect(result.rateLimitRemaining).toBe(5);
    });

    it('returns healthy overall when only rate limit is low', async () => {
      const result = await service.checkHealth();
      expect(result.overall).toBe('healthy');
    });
  });

  describe('all failures scenario', () => {
    beforeEach(() => {
      const client = createMockClient({
        listTagsThrows: true,
        createContactThrows: true,
        getContactsThrows: true,
      });
      service = new GhlHealthService(client);
    });

    it('returns down overall status', async () => {
      const result = await service.checkHealth();
      expect(result.overall).toBe('down');
    });
  });

  describe('ping', () => {
    it('returns true when API is reachable', async () => {
      const client = createMockClient();
      service = new GhlHealthService(client);
      const result = await service.ping();
      expect(result).toBe(true);
    });

    it('returns false when API errors', async () => {
      const client = createMockClient({ listTagsThrows: true });
      service = new GhlHealthService(client);
      const result = await service.ping();
      expect(result).toBe(false);
    });
  });

  describe('formatAlertMessage', () => {
    it('formats healthy message', () => {
      const client = createMockClient();
      service = new GhlHealthService(client);
      const status: GhlHealthStatus = {
        overall: 'healthy',
        lastCheck: new Date().toISOString(),
        apiAccessible: true,
        authValid: true,
        contactCreationWorks: true,
        conversationAccessible: true,
        pipelineAccessible: true,
        rateLimitRemaining: 100,
        rateLimitReset: new Date().toISOString(),
        webhookDeliveries24h: { total: 0, failed: 0, successRate: 100 },
        latencyMs: 150,
      };
      const msg = service.formatAlertMessage(status);
      expect(msg.emoji).toBe('✅');
      expect(msg.title).toContain('OK');
    });

    it('formats degraded message', () => {
      const client = createMockClient();
      service = new GhlHealthService(client);
      const status: GhlHealthStatus = {
        overall: 'degraded',
        lastCheck: new Date().toISOString(),
        apiAccessible: true,
        authValid: false,
        contactCreationWorks: true,
        conversationAccessible: true,
        pipelineAccessible: true,
        rateLimitRemaining: null,
        rateLimitReset: null,
        webhookDeliveries24h: { total: 0, failed: 0, successRate: 100 },
        latencyMs: 5000,
      };
      const msg = service.formatAlertMessage(status);
      expect(msg.emoji).toBe('🟡');
      expect(msg.title).toContain('DEGRADED');
    });

    it('formats down message', () => {
      const client = createMockClient();
      service = new GhlHealthService(client);
      const status: GhlHealthStatus = {
        overall: 'down',
        lastCheck: new Date().toISOString(),
        apiAccessible: false,
        authValid: false,
        contactCreationWorks: false,
        conversationAccessible: false,
        pipelineAccessible: false,
        rateLimitRemaining: null,
        rateLimitReset: null,
        webhookDeliveries24h: { total: 0, failed: 0, successRate: 0 },
        latencyMs: 30000,
      };
      const msg = service.formatAlertMessage(status);
      expect(msg.emoji).toBe('🔴');
      expect(msg.title).toContain('DOWN');
    });
  });
});
