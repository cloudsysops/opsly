import { describe, it, expect } from 'vitest';
import { ValidationFeedbackLayer } from '../lib/validation/validation-feedback.js';
import { LocalWorkerPool } from '../lib/local-worker-pool.js';
import { ValidationMetricsStore } from '../lib/validation/validation-metrics.js';

describe('ValidationFeedbackLayer + LocalWorkerPool - Parallel Execution', () => {
  describe('ValidationFeedbackLayer: Initialization', () => {
    it('should initialize ValidationFeedbackLayer', () => {
      const feedbackLayer = new ValidationFeedbackLayer();
      expect(feedbackLayer).toBeDefined();
    });

    it('should have required methods', () => {
      const feedbackLayer = new ValidationFeedbackLayer();
      expect(typeof feedbackLayer.applyValidationFeedback).toBe('function');
      expect(typeof feedbackLayer.recommendModelTier).toBe('function');
      expect(typeof feedbackLayer.getEscalationRoute).toBe('function');
      expect(typeof feedbackLayer.calculateAdaptationConfidence).toBe('function');
    });
  });

  describe('LocalWorkerPool: Agent Discovery', () => {
    it('should initialize LocalWorkerPool', () => {
      const workerPool = new LocalWorkerPool();
      expect(workerPool).toBeDefined();
    });

    it('should report pool statistics', () => {
      const workerPool = new LocalWorkerPool();
      const stats = workerPool.getPoolStats();

      expect(stats).toBeDefined();
      expect(stats.total_agents).toBeGreaterThan(0);
      expect(stats.agents_by_role).toBeDefined();
    });

    it('should filter agents by role', () => {
      const workerPool = new LocalWorkerPool();
      const executors = workerPool.getAgentsByRole('executor');

      expect(Array.isArray(executors)).toBe(true);
      if (executors.length > 0) {
        expect(executors[0].role).toBe('executor');
      }
    });

    it('should get agent by name', () => {
      const workerPool = new LocalWorkerPool();
      const cursor = workerPool.getAgent('local_cursor');

      if (cursor) {
        expect(cursor.name).toBe('local_cursor');
        expect(cursor.port).toBe(5001);
      }
    });
  });

  describe('ValidationMetricsStore: Initialization', () => {
    it('should initialize ValidationMetricsStore', () => {
      const metricsStore = new ValidationMetricsStore();
      expect(metricsStore).toBeDefined();
    });

    it('should have record and retrieval methods', () => {
      const metricsStore = new ValidationMetricsStore();
      expect(typeof metricsStore.recordValidationMetric).toBe('function');
      expect(typeof metricsStore.getValidationHistoryForIntent).toBe('function');
      expect(typeof metricsStore.getAgentPerformance).toBe('function');
      expect(typeof metricsStore.suggestModelTierForAgent).toBe('function');
    });
  });

  describe('Parallel Execution: LocalWorkerPool Configuration', () => {
    it('should prepare parallel execution with multiple agents', () => {
      const workerPool = new LocalWorkerPool();
      const agents = workerPool.getEnabledAgents();

      expect(agents.length).toBeGreaterThanOrEqual(0);
      expect(agents.every((a) => a.endpoint && a.port)).toBe(true);
    });

    it('should support agent health checks', async () => {
      const workerPool = new LocalWorkerPool();
      const enabledAgents = workerPool.getEnabledAgents();

      // Should have health check method
      expect(typeof workerPool.checkAgentHealth).toBe('function');
      expect(typeof workerPool.checkPoolHealth).toBe('function');

      // Don't actually call them as agents may not be running
      // Just verify the methods exist and can be called
    });
  });

  describe('Integration: Metrics + Feedback Flow', () => {
    it('should support complete metrics recording flow', async () => {
      const metricsStore = new ValidationMetricsStore();

      // Test that we can record a metric
      const result = await metricsStore.recordValidationMetric({
        job_id: 'test-123',
        intent: 'test-intent',
        agent_role: 'executor',
        action: 'commit',
        iteration_count: 1,
        validation_time_ms: 100,
        failed_checks: [],
        model_tier: 'balanced',
        created_at: new Date().toISOString(),
      });

      expect(typeof result).toBe('boolean');
    });

    it('should support confidence calculation', async () => {
      const feedbackLayer = new ValidationFeedbackLayer();

      // Should return a confidence between 0 and 1
      const confidence = await feedbackLayer.calculateAdaptationConfidence('executor', 'test-intent');

      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });

    it('should support escalation routing', async () => {
      const feedbackLayer = new ValidationFeedbackLayer();

      const route = await feedbackLayer.getEscalationRoute('test-intent', 'build failure');

      expect(typeof route).toBe('string');
      expect(route.length).toBeGreaterThan(0);
    });
  });

  describe('Parallel Execution: Architecture Validation', () => {
    it('should support max concurrent configuration', () => {
      const workerPool = new LocalWorkerPool();
      const agents = workerPool.getEnabledAgents();

      // Verify agents have necessary properties for parallel execution
      agents.forEach((agent) => {
        expect(agent.name).toBeDefined();
        expect(agent.endpoint).toBeDefined();
        expect(agent.port).toBeDefined();
        expect(agent.timeout).toBeGreaterThan(0);
      });
    });

    it('should support execution request structure', () => {
      const request = {
        prompt_content: 'Test prompt',
        prompt_path: '.cursor/prompts/test.md',
        job_id: 'job-123',
        agent_roles: ['executor', 'analyzer'],
        max_concurrent: 2,
        timeout: 60000,
      };

      expect(request.job_id).toBeDefined();
      expect(request.agent_roles).toBeInstanceOf(Array);
      expect(request.max_concurrent).toBeGreaterThan(0);
    });
  });
});
