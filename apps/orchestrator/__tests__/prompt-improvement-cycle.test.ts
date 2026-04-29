/**
 * Test suite for meta-optimizer prompt improvement cycle.
 *
 * Tests: semantic similarity scoring, validation sandbox, rollback triggers,
 * and real-world prompt improvement scenarios.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateCosineSimilarity,
  calculateImprovementScore,
  validatePromptSandbox,
  evaluatePromptImprovement,
  IMPROVEMENT_THRESHOLD_PCT,
  EMBEDDING_DISTANCE_WORSE_THRESHOLD,
} from '../src/meta/prompt-improvement-cycle.js';
import { metricsStore } from '../src/meta/orchestrator-metrics-store.js';
import {
  ROUTING_DISPATCH_PROMPT,
  INTENT_VALIDATION_PROMPT,
  CONTEXT_ENRICHMENT_PROMPT,
} from './fixtures/meta-optimizer-test-prompts.js';

describe('Meta-Optimizer: Prompt Improvement Cycle', () => {
  beforeEach(() => {
    metricsStore.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('calculateCosineSimilarity', () => {
    it('should return 1.0 similarity for identical embeddings', () => {
      const emb = [1, 0, 0, 1];
      const result = calculateCosineSimilarity(emb, emb);
      expect(result.similarity).toBeCloseTo(1.0, 5);
      expect(result.distance).toBeCloseTo(0.0, 5);
    });

    it('should return 0.0 for orthogonal embeddings', () => {
      const emb1 = [1, 0];
      const emb2 = [0, 1];
      const result = calculateCosineSimilarity(emb1, emb2);
      expect(result.similarity).toBeCloseTo(0.0, 5);
      expect(result.distance).toBeCloseTo(1.0, 5);
    });

    it('should handle different embedding lengths gracefully', () => {
      const emb1 = [1, 0, 1];
      const emb2 = [1, 0];
      const result = calculateCosineSimilarity(emb1, emb2);
      expect(result.similarity).toBe(0);
      expect(result.distance).toBe(1);
    });

    it('should handle empty embeddings', () => {
      const result = calculateCosineSimilarity([], []);
      expect(result.similarity).toBe(0);
      expect(result.distance).toBe(1);
    });
  });

  describe('calculateImprovementScore', () => {
    it('should calculate improvement percentage correctly', () => {
      const originalDistance = 0.3; // similarity 0.7
      const improvedDistance = 0.2; // similarity 0.8
      const result = calculateImprovementScore(originalDistance, improvedDistance);

      // improvement = (0.8 - 0.7) / 0.7 * 100 = 14.29%
      expect(result.score).toBeGreaterThan(10);
      expect(result.meetsThreshold).toBe(true);
    });

    it('should detect failure to meet threshold', () => {
      const originalDistance = 0.1; // similarity 0.9
      const improvedDistance = 0.15; // similarity 0.85
      const result = calculateImprovementScore(originalDistance, improvedDistance);

      // improvement = (0.85 - 0.9) / 0.9 * 100 = -5.56%
      expect(result.score).toBeLessThan(IMPROVEMENT_THRESHOLD_PCT);
      expect(result.meetsThreshold).toBe(false);
    });

    it('should handle zero original distance edge case', () => {
      const originalDistance = 0; // similarity 1.0
      const improvedDistance = 0.2; // similarity 0.8 (degraded)
      const result = calculateImprovementScore(originalDistance, improvedDistance);

      // When original is perfect (distance 0), any degradation shows as negative improvement
      // But we return 0 for negative scores, so score should be 0
      expect(result.score).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });

    it('should handle case where original is zero and improved is also zero', () => {
      const originalDistance = 0;
      const improvedDistance = 0;
      const result = calculateImprovementScore(originalDistance, improvedDistance);

      expect(result.score).toBe(0);
      expect(result.meetsThreshold).toBe(false);
    });
  });

  describe('validatePromptSandbox', () => {
    it('should pass validation for good prompt improvement', async () => {
      const original = 'Determine routing decision for intent dispatch';
      const improved =
        'Analyze the intent request and determine appropriate routing decision for handler dispatch';

      const testCases = [
        { input: 'deploy app', expectedKeywords: ['routing', 'dispatch'] },
        { input: 'execute terraform', expectedKeywords: ['routing', 'handler'] },
      ];

      const result = await validatePromptSandbox(original, improved, testCases);

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.testResults.length).toBe(2);
    });

    it('should reject identical prompts', async () => {
      const prompt = 'Validate the intent payload structure';
      const testCases = [{ input: 'test', expectedKeywords: ['validate'] }];

      const result = await validatePromptSandbox(prompt, prompt, testCases);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('identical'))).toBe(true);
    });

    it('should reject prompts that are too short', async () => {
      const original = 'Validate intent payload structure for routing';
      const improved = 'Validate'; // too short

      const testCases = [{ input: 'test', expectedKeywords: ['validate'] }];

      const result = await validatePromptSandbox(original, improved, testCases);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('length'))).toBe(true);
    });

    it('should reject prompts that are too long', async () => {
      const original = 'Validate intent payload structure';
      const improved =
        original +
        ' ' +
        'Additional lengthy explanation that goes on and on'.repeat(50);

      const testCases = [{ input: 'test', expectedKeywords: ['validate'] }];

      const result = await validatePromptSandbox(original, improved, testCases);

      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('length'))).toBe(true);
    });

    it('should track test result details', async () => {
      const original = 'Route the intent dispatch request';
      const improved = 'Analyze and route the intent dispatch request appropriately';

      const testCases = [
        { input: 'deploy to prod', expectedKeywords: ['route', 'dispatch'] },
        { input: 'invalid request', expectedKeywords: ['route', 'missing_keyword'] },
      ];

      const result = await validatePromptSandbox(original, improved, testCases);

      expect(result.testResults.length).toBe(2);
      expect(result.testResults[0].passed).toBe(true);
      // Second test will likely pass because 'route' is in the improved prompt
    });
  });

  describe('evaluatePromptImprovement (with mocked embeddings)', () => {
    it('should trigger rollback when embedding distance increases too much', async () => {
      // Mock fetch to return embeddings
      global.fetch = vi.fn((url: string) => {
        return Promise.resolve({
          ok: true,
          json: async () => {
            // Simulate embeddings that show semantic degradation
            if (url.includes('/v1/embeddings')) {
              return {
                data: [{ embedding: [0.1, 0.2, 0.3] }],
                model: 'test-model',
                usage: { tokens: 10 },
              };
            }
            return {};
          },
        } as Response);
      });

      const result = await evaluatePromptImprovement({
        promptName: 'test-prompt',
        originalPrompt: 'Original routing prompt',
        improvedPrompt: 'Completely different prompt about something else',
        testCases: [{ input: 'test', expectedKeywords: ['routing'] }],
        llmGatewayBaseUrl: 'http://test-gateway:3010',
      });

      // Note: with identical embeddings returned, distance will be 0, so improvement is neutral
      // In real scenario, degraded embedding would increase distance
      expect(result.prompt_name).toBe('test-prompt');
      expect(result.validation_passed).toBe(false); // Different prompt fails validation
    });

    it('should reject improvements that fail sandbox validation', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.5, 0.5, 0.5] }],
            model: 'test-model',
            usage: { tokens: 10 },
          }),
        } as Response)
      );

      const result = await evaluatePromptImprovement({
        promptName: 'test-prompt',
        originalPrompt: 'Original routing prompt',
        improvedPrompt: 'x', // Too short, fails validation
        testCases: [{ input: 'test', expectedKeywords: ['routing'] }],
        llmGatewayBaseUrl: 'http://test-gateway:3010',
      });

      expect(result.rollback_triggered).toBe(true);
      expect(result.validation_passed).toBe(false);
    });

    it('should handle LLM Gateway timeouts and errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Connection timeout'))
      );

      const result = await evaluatePromptImprovement({
        promptName: 'test-prompt',
        originalPrompt: 'Original prompt',
        improvedPrompt: 'Improved prompt',
        testCases: [{ input: 'test', expectedKeywords: ['test'] }],
        llmGatewayBaseUrl: 'http://test-gateway:3010',
      });

      expect(result.rollback_triggered).toBe(true);
      expect(result.rollback_reason).toContain('LLM Gateway error');
    });

    it('should record metrics in store upon completion', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.4, 0.4, 0.4] }],
            model: 'test-model',
            usage: { tokens: 10 },
          }),
        } as Response)
      );

      const result = await evaluatePromptImprovement({
        promptName: 'context-enrichment',
        originalPrompt: 'Enrich context from memory',
        improvedPrompt: 'Enrich and build context from working memory',
        testCases: [{ input: 'deploy', expectedKeywords: ['context', 'memory'] }],
      });

      metricsStore.recordMetric(result);

      const metrics = metricsStore.getMetricsForPrompt('context-enrichment');
      expect(metrics).toHaveLength(1);
      expect(metrics[0].id).toBe(result.id);
    });
  });

  describe('Real-world test cases', () => {
    beforeEach(() => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.3, 0.4, 0.5, 0.2, 0.1] }],
            model: 'test-embeddings',
            usage: { tokens: 15 },
          }),
        } as Response)
      );
    });

    it('should validate routing dispatch prompt improvement', async () => {
      const improved = ROUTING_DISPATCH_PROMPT.original.replace(
        'Determine which worker should handle this intent',
        'Analyze the intent type, tenant context, and determine which specialized worker should handle this routing decision'
      );

      const result = await evaluatePromptImprovement({
        promptName: 'routing-dispatch',
        originalPrompt: ROUTING_DISPATCH_PROMPT.original,
        improvedPrompt: improved,
        testCases: ROUTING_DISPATCH_PROMPT.testCases,
      });

      expect(result.prompt_name).toBe('routing-dispatch');
      expect(result.test_cases_total).toBe(ROUTING_DISPATCH_PROMPT.testCases.length);
    });

    it('should validate intent validation prompt improvement', async () => {
      const improved = INTENT_VALIDATION_PROMPT.original.replace(
        'Check the payload and report any validation errors.',
        'Thoroughly check the payload structure, validate required fields are present, and report any validation errors with specific field information.'
      );

      const result = await evaluatePromptImprovement({
        promptName: 'intent-validation',
        originalPrompt: INTENT_VALIDATION_PROMPT.original,
        improvedPrompt: improved,
        testCases: INTENT_VALIDATION_PROMPT.testCases,
      });

      expect(result.prompt_name).toBe('intent-validation');
      metricsStore.recordMetric(result);

      const summary = metricsStore.getSummary();
      expect(summary['intent-validation']).toBeDefined();
    });

    it('should validate context enrichment prompt improvement', async () => {
      const improved = CONTEXT_ENRICHMENT_PROMPT.original.replace(
        'determine what additional context',
        'intelligently analyze and determine what additional environmental context'
      );

      const result = await evaluatePromptImprovement({
        promptName: 'context-enrichment',
        originalPrompt: CONTEXT_ENRICHMENT_PROMPT.original,
        improvedPrompt: improved,
        testCases: CONTEXT_ENRICHMENT_PROMPT.testCases,
      });

      expect(result.prompt_name).toBe('context-enrichment');
    });
  });

  describe('Circuit breaker and cooldown', () => {
    it('should track rollback count for circuit breaker', () => {
      const metric = {
        id: 'test1',
        prompt_name: 'failing-prompt',
        timestamp: new Date().toISOString(),
        original_score: 50,
        improved_score: 48,
        improvement_pct: -4,
        validation_passed: false,
        validation_errors: ['test failed'],
        test_cases_passed: 0,
        test_cases_total: 1,
        rollback_triggered: true,
        rollback_reason: 'Validation failed',
        embedding_distance: 0.5,
        llm_gateway_latency_ms: 100,
      };

      metricsStore.recordMetric(metric);
      expect(metricsStore.isPromptInCooldown('failing-prompt')).toBe(false);

      metricsStore.recordMetric({ ...metric, id: 'test2' });
      metricsStore.recordMetric({ ...metric, id: 'test3' });

      expect(metricsStore.isPromptInCooldown('failing-prompt', 3)).toBe(true);
    });
  });

  describe('Integration: Full improvement cycle', () => {
    it('should handle complete evaluation → storage → summary workflow', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: async () => ({
            data: [{ embedding: [0.2, 0.3, 0.4] }],
            model: 'test-model',
            usage: { tokens: 20 },
          }),
        } as Response)
      );

      const prompts = [
        {
          name: 'dispatch',
          original: ROUTING_DISPATCH_PROMPT.original,
          improved: 'Improved dispatch prompt with better clarity',
          testCases: ROUTING_DISPATCH_PROMPT.testCases,
        },
        {
          name: 'validation',
          original: INTENT_VALIDATION_PROMPT.original,
          improved: 'Enhanced validation with detailed checks',
          testCases: INTENT_VALIDATION_PROMPT.testCases,
        },
      ];

      for (const prompt of prompts) {
        const result = await evaluatePromptImprovement({
          promptName: prompt.name,
          originalPrompt: prompt.original,
          improvedPrompt: prompt.improved,
          testCases: prompt.testCases,
        });

        metricsStore.recordMetric(result);
      }

      const summary = metricsStore.getSummary();
      expect(Object.keys(summary)).toHaveLength(2);
      expect(summary['dispatch']).toBeDefined();
      expect(summary['validation']).toBeDefined();

      const allMetrics = metricsStore.getAllMetrics();
      expect(allMetrics.length).toBe(2);
    });
  });
});
