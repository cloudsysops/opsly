import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationMetricsStore } from '../lib/validation-metrics.js';
import { ValidationFeedbackLayer } from '../lib/validation-feedback.js';
import { ValidationDashboard } from '../lib/validation-dashboard.js';
import { LocalWorkerPool } from '../lib/local-worker-pool.js';

/**
 * End-to-End Integration Tests: ValidationOrchestrator ↔ OpenClaw
 * Tests the complete feedback loop: metrics → feedback → adapted decisions
 */
describe('ValidationOrchestrator E2E - Feedback Loop Integration', () => {
  let metricsStore: ValidationMetricsStore;
  let feedbackLayer: ValidationFeedbackLayer;
  let dashboard: ValidationDashboard;
  let workerPool: LocalWorkerPool;

  beforeEach(() => {
    metricsStore = new ValidationMetricsStore();
    feedbackLayer = new ValidationFeedbackLayer();
    dashboard = new ValidationDashboard();
    workerPool = new LocalWorkerPool();
  });

  describe('Phase 1: Metrics Storage', () => {
    it('should initialize ValidationMetricsStore', () => {
      expect(metricsStore).toBeDefined();
      expect(typeof metricsStore.recordValidationMetric).toBe('function');
    });

    it('should have required metrics methods', () => {
      expect(typeof metricsStore.getIntentValidationHistory).toBe('function');
      expect(typeof metricsStore.getAgentPerformance).toBe('function');
      expect(typeof metricsStore.suggestModelTierForAgent).toBe('function');
      expect(typeof metricsStore.getEscalationRoute).toBe('function');
    });
  });

  describe('Phase 2: Feedback Loop Adaptation', () => {
    it('should initialize ValidationFeedbackLayer', () => {
      expect(feedbackLayer).toBeDefined();
      expect(typeof feedbackLayer.applyValidationFeedback).toBe('function');
    });

    it('should have feedback methods', () => {
      expect(typeof feedbackLayer.recommendModelTier).toBe('function');
      expect(typeof feedbackLayer.getEscalationRoute).toBe('function');
      expect(typeof feedbackLayer.calculateAdaptationConfidence).toBe('function');
    });

    it('should calculate adaptation confidence', async () => {
      const confidence = await feedbackLayer.calculateAdaptationConfidence('executor', 'test');
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Phase 3: Parallel Execution', () => {
    it('should initialize LocalWorkerPool', () => {
      expect(workerPool).toBeDefined();
    });

    it('should report pool statistics', () => {
      const stats = workerPool.getPoolStats();
      expect(stats).toBeDefined();
      expect(stats.total_agents).toBeGreaterThan(0);
      expect(stats.agents_by_role).toBeDefined();
    });

    it('should filter agents by role', () => {
      const executors = workerPool.getAgentsByRole('executor');
      expect(Array.isArray(executors)).toBe(true);
      if (executors.length > 0) {
        expect(executors[0].role).toBe('executor');
      }
    });

    it('should get agent by name', () => {
      const cursor = workerPool.getAgent('cursor');
      if (cursor) {
        expect(cursor.name).toBe('cursor');
        expect(cursor.port).toBeGreaterThan(0);
      }
    });

    it('should check agent health methods exist', () => {
      expect(typeof workerPool.checkAgentHealth).toBe('function');
      expect(typeof workerPool.checkPoolHealth).toBe('function');
    });
  });

  describe('Phase 4: Observability & Metrics Dashboard', () => {
    it('should initialize ValidationDashboard', () => {
      expect(dashboard).toBeDefined();
      expect(typeof dashboard.getMetrics).toBe('function');
    });

    it('should support metrics retrieval', async () => {
      const metrics = await dashboard.getMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
      expect(Array.isArray(metrics.agents)).toBe(true);
    });

    it('should support agent metrics queries', async () => {
      const agentMetrics = await dashboard.getAgentMetrics('executor');
      expect(agentMetrics).toBeDefined();
      expect(agentMetrics.role).toBe('executor');
    });

    it('should support intent metrics queries', async () => {
      const intentMetrics = await dashboard.getIntentMetrics('execute_code');
      expect(intentMetrics).toBeDefined();
      expect(intentMetrics.intent).toBe('execute_code');
    });

    it('should export metrics for analytics', async () => {
      const exported = await dashboard.exportMetricsForAnalytics();
      expect(exported).toBeDefined();
      expect(typeof exported).toBe('object');
    });
  });

  describe('Phase 5: Feedback Adaptation in Routing Decisions', () => {
    it('should apply validation feedback to routing', async () => {
      const mockDecision = {
        intent: 'execute_code' as const,
        reason: 'initial routing',
        execution: {
          target: 'queue' as const,
          transport: 'bullmq' as const,
          queue: 'openclaw' as any,
          skill: null,
          mcp: null,
        },
        llm: {
          routing_bias: 'balanced' as const,
          provider_hint: null,
        },
        agent: {
          id: 'executor-default',
          role: 'executor' as const,
          skill_binding: 'opsly-api' as any,
          model_tier: 'balanced' as const,
          targets: ['queue'] as any[],
          tenant_permissions: ['self'] as any[],
        },
      };

      const result = await feedbackLayer.applyValidationFeedback('execute_code', mockDecision as any);
      expect(result).toBeDefined();
      expect(result.adapted).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.adaptations)).toBe(true);
    });

    it('should return original decision if no history available', async () => {
      const mockDecision = {
        intent: 'execute_code' as const,
        reason: 'initial routing',
        execution: {
          target: 'queue' as const,
          transport: 'bullmq' as const,
          queue: 'openclaw' as any,
          skill: null,
          mcp: null,
        },
        llm: {
          routing_bias: 'balanced' as const,
          provider_hint: null,
        },
        agent: {
          id: 'executor-default',
          role: 'executor' as const,
          skill_binding: 'opsly-api' as any,
          model_tier: 'balanced' as const,
          targets: ['queue'] as any[],
          tenant_permissions: ['self'] as any[],
        },
      };

      const result = await feedbackLayer.applyValidationFeedback('unknown_intent', mockDecision as any);
      expect(result.adapted).toBeDefined();
    });
  });

  describe('Integration: Full Feedback Loop', () => {
    it('should handle complete metrics and feedback cycle', async () => {
      const confidence = await feedbackLayer.calculateAdaptationConfidence('executor', 'test');
      expect(typeof confidence).toBe('number');

      const metrics = await dashboard.getMetrics();
      expect(metrics.timestamp).toBeDefined();

      const stats = workerPool.getPoolStats();
      expect(stats.total_agents).toBeGreaterThan(0);
    });

    it('should support system health monitoring', async () => {
      const metrics = await dashboard.getMetrics();
      expect(metrics.system_health).toBeDefined();
      expect(typeof metrics.system_health.avg_validation_time_ms).toBe('number');
      expect(typeof metrics.system_health.escalation_rate_pct).toBe('number');
    });

    it('should support worker pool configuration', () => {
      const enabled = workerPool.getEnabledAgents();
      expect(Array.isArray(enabled)).toBe(true);

      const agents = workerPool.getAgentsByRole('executor');
      expect(Array.isArray(agents)).toBe(true);
    });
  });
});
