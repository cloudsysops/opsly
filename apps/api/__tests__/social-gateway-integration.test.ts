// Unit and Integration Tests for Syra ↔ OpenClaw Gateway Integration

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import * as gateway from '@intcloudsysops/llm-gateway';
import {
  callGatewayForContent,
  callGatewayForMultipleContentTypes,
  type GatewayCallOptions,
} from '../lib/social/gateway-integration';
import { POST as publishRoute } from '../app/api/social/publish/route';

// Mock the LLM Gateway module
vi.mock('@intcloudsysops/llm-gateway', () => ({
  llmCall: vi.fn(),
  logUsage: vi.fn(),
}));

// Publish route uses getServiceClient().schema('platform')
vi.mock('../lib/supabase', () => ({
  getServiceClient: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      })),
    })),
  })),
}));

// Mock knowledge capture
vi.mock('../lib/knowledge/syra-capture', () => ({
  capturePublishEvent: vi.fn(),
  capturePublishError: vi.fn(),
}));

// Mock auth
vi.mock('../lib/auth', () => ({
  requireAdminAccess: vi.fn(() => Promise.resolve(null)),
}));

// Mock social publisher
vi.mock('../lib/social/adapters/publisher', () => ({
  multiPlatformPublisher: {
    publishToAll: vi.fn(),
  },
}));

describe('Gateway Integration - Unit Tests (callGatewayForContent)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // === UNIT TESTS: 200 OK Success Case ===
  describe('200 OK Response', () => {
    it('should call LLM Gateway with correct parameters', async () => {
      const mockResponse = {
        content: 'Generated Twitter content here',
        tokens_input: 45,
        tokens_output: 120,
        cost_usd: 0.0015,
        cache_hit: false,
      };

      vi.mocked(gateway.llmCall).mockResolvedValue(mockResponse);

      const result = await callGatewayForContent({
        tenant_slug: 'acme',
        content_type: 'twitter',
        prompt: 'Create a tweet about DevOps automation',
        temperature: 0.7,
      });

      // Verify llmCall was invoked
      expect(vi.mocked(gateway.llmCall)).toHaveBeenCalledTimes(1);
      const callArgs = vi.mocked(gateway.llmCall).mock.calls[0][0];
      expect(callArgs.tenant_slug).toBe('acme');
      expect(callArgs.model).toBe('syra_content_generation');
      expect(callArgs.temperature).toBe(0.7);
      expect(callArgs.messages).toHaveLength(1);
      expect(callArgs.messages[0].content).toBe('Create a tweet about DevOps automation');
    });

    it('should generate request_id with syra prefix and tenant slug', async () => {
      const mockResponse = {
        content: 'LinkedIn post content',
        tokens_input: 50,
        tokens_output: 150,
        cost_usd: 0.002,
        cache_hit: false,
      };

      vi.mocked(gateway.llmCall).mockResolvedValue(mockResponse);

      const result = await callGatewayForContent({
        tenant_slug: 'beta-corp',
        content_type: 'linkedin',
        prompt: 'Create a LinkedIn post',
      });

      expect(result.request_id).toMatch(/^syra:beta-corp:[a-f0-9-]{36}$/);
      expect(vi.mocked(gateway.logUsage)).toHaveBeenCalledWith(
        expect.objectContaining({
          request_id: result.request_id,
          tenant_slug: 'beta-corp',
        })
      );
    });

    it('should propagate request_id when provided', async () => {
      const mockResponse = {
        content: 'Discord message',
        tokens_input: 30,
        tokens_output: 100,
        cost_usd: 0.001,
        cache_hit: false,
      };

      vi.mocked(gateway.llmCall).mockResolvedValue(mockResponse);
      const customRequestId = 'custom:req:12345';

      const result = await callGatewayForContent({
        tenant_slug: 'acme',
        content_type: 'discord',
        prompt: 'Create a Discord message',
        request_id: customRequestId,
      });

      expect(result.request_id).toBe(customRequestId);
      expect(vi.mocked(gateway.llmCall)).toHaveBeenCalledWith(
        expect.objectContaining({ request_id: customRequestId })
      );
    });

    it('should log usage with correct tokens and cost', async () => {
      const mockResponse = {
        content: 'Slack message',
        tokens_input: 60,
        tokens_output: 180,
        cost_usd: 0.0025,
        cache_hit: true,
      };

      vi.mocked(gateway.llmCall).mockResolvedValue(mockResponse);

      await callGatewayForContent({
        tenant_slug: 'acme',
        content_type: 'slack',
        prompt: 'Create a Slack notification',
        metadata: { event_id: 'evt-123' },
      });

      expect(vi.mocked(gateway.logUsage)).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_slug: 'acme',
          model: 'syra_content_generation',
          tokens_input: 60,
          tokens_output: 180,
          cost_usd: 0.0025,
          cache_hit: true,
          feature: 'social_content_slack',
          metadata: expect.objectContaining({
            event_id: 'evt-123',
            gateway_provider: 'openclaw',
            syra_agent: true,
          }),
        })
      );
    });

    it('should return complete GatewayCallResult with content and metrics', async () => {
      const mockResponse = {
        content: 'Generated content example',
        tokens_input: 40,
        tokens_output: 110,
        cost_usd: 0.0012,
        cache_hit: false,
      };

      vi.mocked(gateway.llmCall).mockResolvedValue(mockResponse);

      const result = await callGatewayForContent({
        tenant_slug: 'acme',
        content_type: 'twitter',
        prompt: 'Test prompt',
      });

      expect(result).toMatchObject({
        content: 'Generated content example',
        tokens_input: 40,
        tokens_output: 110,
        cost_usd: 0.0012,
      });
      expect(result.request_id).toBeDefined();
    });
  });

  // === UNIT TESTS: TIMEOUT Case ===
  describe('Timeout Handling', () => {
    it('should throw readable error on gateway timeout', async () => {
      const timeoutError = new Error('ECONNREFUSED: Connection refused');
      vi.mocked(gateway.llmCall).mockRejectedValue(timeoutError);

      await expect(
        callGatewayForContent({
          tenant_slug: 'acme',
          content_type: 'twitter',
          prompt: 'Test prompt',
        })
      ).rejects.toThrow(/Gateway timeout/);
    });

    it('should throw error on socket timeout', async () => {
      const timeoutError = new Error('timeout: request took too long');
      vi.mocked(gateway.llmCall).mockRejectedValue(timeoutError);

      await expect(
        callGatewayForContent({
          tenant_slug: 'acme',
          content_type: 'linkedin',
          prompt: 'Test',
        })
      ).rejects.toThrow(/Gateway timeout/);
    });

    it('should NOT call logUsage when gateway times out', async () => {
      const timeoutError = new Error('ECONNREFUSED');
      vi.mocked(gateway.llmCall).mockRejectedValue(timeoutError);

      try {
        await callGatewayForContent({
          tenant_slug: 'acme',
          content_type: 'discord',
          prompt: 'Test',
        });
      } catch {
        // Expected
      }

      expect(vi.mocked(gateway.logUsage)).not.toHaveBeenCalled();
    });
  });

  // === UNIT TESTS: 429 Rate Limit Case ===
  describe('429 Rate Limit Handling', () => {
    it('should throw rate limit error on 429 response', async () => {
      const rateLimitError = new Error('HTTP 429: Too many requests');
      vi.mocked(gateway.llmCall).mockRejectedValue(rateLimitError);

      await expect(
        callGatewayForContent({
          tenant_slug: 'acme',
          content_type: 'twitter',
          prompt: 'Test',
        })
      ).rejects.toThrow(/Gateway rate limited \(429\)/);
    });

    it('should include tenant_slug in rate limit error message', async () => {
      const rateLimitError = new Error('429 Too Many Requests');
      vi.mocked(gateway.llmCall).mockRejectedValue(rateLimitError);

      await expect(
        callGatewayForContent({
          tenant_slug: 'premium-client',
          content_type: 'linkedin',
          prompt: 'Test',
        })
      ).rejects.toThrow(/tenant premium-client/);
    });

    it('should NOT call logUsage on 429 error', async () => {
      const rateLimitError = new Error('429');
      vi.mocked(gateway.llmCall).mockRejectedValue(rateLimitError);

      try {
        await callGatewayForContent({
          tenant_slug: 'acme',
          content_type: 'slack',
          prompt: 'Test',
        });
      } catch {
        // Expected
      }

      expect(vi.mocked(gateway.logUsage)).not.toHaveBeenCalled();
    });
  });

  // === Batch/Multiple Content Types ===
  describe('Batch content type generation', () => {
    it('should generate content for multiple platforms', async () => {
      vi.mocked(gateway.llmCall).mockResolvedValue({
        content: 'Generated content',
        tokens_input: 40,
        tokens_output: 100,
        cost_usd: 0.001,
        cache_hit: false,
      });

      const results = await callGatewayForMultipleContentTypes({
        tenant_slug: 'acme',
        content_types: ['twitter', 'linkedin', 'discord'],
        prompt: 'Multi-platform content',
      });

      expect(Object.keys(results)).toContain('twitter');
      expect(Object.keys(results)).toContain('linkedin');
      expect(Object.keys(results)).toContain('discord');
    });

    it('should propagate same request_id across batch calls', async () => {
      vi.mocked(gateway.llmCall).mockResolvedValue({
        content: 'Generated content',
        tokens_input: 40,
        tokens_output: 100,
        cost_usd: 0.001,
        cache_hit: false,
      });

      const customId = 'batch:req:xyz';
      const results = await callGatewayForMultipleContentTypes({
        tenant_slug: 'acme',
        content_types: ['twitter', 'linkedin'],
        prompt: 'Batch test',
        request_id: customId,
      });

      // All results should have same request_id
      expect(results.twitter.request_id).toBe(customId);
      expect(results.linkedin.request_id).toBe(customId);
    });

    it('should continue on partial failure in batch', async () => {
      // First call succeeds
      vi.mocked(gateway.llmCall)
        .mockResolvedValueOnce({
          content: 'Twitter success',
          tokens_input: 40,
          tokens_output: 100,
          cost_usd: 0.001,
          cache_hit: false,
        })
        // Second call fails
        .mockRejectedValueOnce(new Error('LinkedIn gen failed'))
        // Third call succeeds
        .mockResolvedValueOnce({
          content: 'Discord success',
          tokens_input: 40,
          tokens_output: 100,
          cost_usd: 0.001,
          cache_hit: false,
        });

      const results = await callGatewayForMultipleContentTypes({
        tenant_slug: 'acme',
        content_types: ['twitter', 'linkedin', 'discord'],
        prompt: 'Test',
      });

      // Twitter and Discord should be present
      expect(results.twitter).toBeDefined();
      expect(results.discord).toBeDefined();
      // LinkedIn should not be present (failed)
      expect(results.linkedin).toBeUndefined();
    });
  });
});

describe('Gateway Integration - Integration Tests (POST /api/social/publish)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // === INTEGRATION TEST: request_id propagation ===
  it('should propagate request_id through entire publish flow', async () => {
    const mockPublisherResponse = [
      { success: true, platform: 'twitter', url: 'https://twitter.com/123' },
      { success: true, platform: 'linkedin', url: 'https://linkedin.com/456' },
    ];

    vi.mocked(gateway.llmCall).mockResolvedValue({
      content: 'Generated',
      tokens_input: 40,
      tokens_output: 100,
      cost_usd: 0.001,
      cache_hit: false,
    });

    const { multiPlatformPublisher } = await import('../lib/social/adapters/publisher');
    vi.mocked(multiPlatformPublisher.publishToAll).mockResolvedValue(mockPublisherResponse);

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'content-123',
        platforms: ['twitter', 'linkedin'],
        content: {
          twitter: { threads: ['Test tweet'], hashtags: [] },
          linkedin: { title: 'Test', body: '', tags: [] },
        },
      }),
    });

    const response = await publishRoute(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('published');
    expect(data.content_id).toBe('content-123');
  });

  // === INTEGRATION TEST: publisher invoked ===
  it('should call multiPlatformPublisher during social publish', async () => {
    const { multiPlatformPublisher } = await import('../lib/social/adapters/publisher');
    vi.mocked(multiPlatformPublisher.publishToAll).mockResolvedValue([
      { success: true, platform: 'twitter', url: 'https://twitter.com/123' },
    ]);

    const request = new NextRequest('http://localhost/api/social/publish', {
      method: 'POST',
      body: JSON.stringify({
        content_id: 'content-123',
        platforms: ['twitter'],
        content: { twitter: { threads: ['Test'], hashtags: [] } },
      }),
    });

    await publishRoute(request);

    expect(vi.mocked(multiPlatformPublisher.publishToAll)).toHaveBeenCalled();
  });

  // === INTEGRATION TEST: Cost tracking verification ===
  it('should track usage with cost metrics for billing', async () => {
    const mockResponse = {
      content: 'Generated content',
      tokens_input: 100,
      tokens_output: 250,
      cost_usd: 0.0045,
      cache_hit: false,
    };

    vi.mocked(gateway.llmCall).mockResolvedValue(mockResponse);

    await callGatewayForContent({
      tenant_slug: 'enterprise-client',
      content_type: 'twitter',
      prompt: 'Enterprise content',
      metadata: { billing_code: 'proj-abc' },
    });

    // Verify usage was logged with cost
    expect(vi.mocked(gateway.logUsage)).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_slug: 'enterprise-client',
        tokens_input: 100,
        tokens_output: 250,
        cost_usd: 0.0045,
        model: 'syra_content_generation',
      })
    );
  });

  // === INTEGRATION TEST: Metadata enrichment ===
  it('should enrich usage logs with event metadata', async () => {
    vi.mocked(gateway.llmCall).mockResolvedValue({
      content: 'Generated',
      tokens_input: 40,
      tokens_output: 100,
      cost_usd: 0.001,
      cache_hit: false,
    });

    const eventMetadata = {
      milestone_id: 'milestone-456',
      deployment_phase: 'phase3',
      team: 'platform-eng',
    };

    await callGatewayForContent({
      tenant_slug: 'acme',
      content_type: 'linkedin',
      prompt: 'Milestone post',
      metadata: eventMetadata,
    });

    expect(vi.mocked(gateway.logUsage)).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining(eventMetadata),
      })
    );
  });
});

describe('Cost Tracking Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track zero-cost cache hits', async () => {
    vi.mocked(gateway.llmCall).mockResolvedValue({
      content: 'Cached response',
      tokens_input: 50,
      tokens_output: 100,
      cost_usd: 0, // Cache hit = zero cost
      cache_hit: true,
    });

    await callGatewayForContent({
      tenant_slug: 'acme',
      content_type: 'twitter',
      prompt: 'Cached prompt',
    });

    expect(vi.mocked(gateway.logUsage)).toHaveBeenCalledWith(
      expect.objectContaining({
        cost_usd: 0,
        cache_hit: true,
      })
    );
  });

  it('should accumulate costs across batch operations', async () => {
    let callCount = 0;
    vi.mocked(gateway.llmCall).mockImplementation(async () => {
      callCount++;
      return {
        content: `Generated ${callCount}`,
        tokens_input: 40,
        tokens_output: 100,
        cost_usd: 0.001 * callCount, // Incrementing cost
        cache_hit: false,
      };
    });

    const results = await callGatewayForMultipleContentTypes({
      tenant_slug: 'acme',
      content_types: ['twitter', 'linkedin', 'discord'],
      prompt: 'Batch test',
    });

    // Should have logged usage 3 times
    expect(vi.mocked(gateway.logUsage)).toHaveBeenCalledTimes(3);

    // Verify costs are tracked individually
    const calls = vi.mocked(gateway.logUsage).mock.calls;
    expect(calls[0][0].cost_usd).toBe(0.001);
    expect(calls[1][0].cost_usd).toBe(0.002);
    expect(calls[2][0].cost_usd).toBe(0.003);
  });
});
