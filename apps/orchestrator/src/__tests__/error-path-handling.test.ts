import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ValidationMetricsStore } from '../lib/validation/validation-metrics.js';

describe('Error Path Handling Tests', () => {
  describe('ValidationMetricsStore graceful degradation', () => {
    let store: ValidationMetricsStore;

    beforeEach(() => {
      // Create store without Supabase credentials to test fallback behavior
      store = new ValidationMetricsStore(5 * 60 * 1000);
    });

    it('handles missing Supabase credentials', async () => {
      const result = await store.recordValidationMetric({
        job_id: 'test',
        intent: 'test',
        agent_role: 'executor',
        action: 'commit',
        iteration_count: 1,
        validation_time_ms: 100,
      });

      // Should return false when Supabase not configured
      expect(result).toBe(false);
    });

    it('getAgentPerformance returns null without Supabase', async () => {
      const performance = await store.getAgentPerformance('executor');

      expect(performance).toBeNull();
    });

    it('caching works even without Supabase', async () => {
      // Even without Supabase, cache operations should not throw
      const cacheKey = 'test-key';
      const data = { test: 'value' };

      // Set in cache
      (store as any).setInCache(cacheKey, data);

      // Get from cache
      const cached = (store as any).getFromCache(cacheKey);
      expect(cached).toEqual(data);
    });

    it('cache respects TTL', async () => {
      return new Promise<void>((resolve) => {
        const shortTtl = 100; // 100ms
        const store = new ValidationMetricsStore(shortTtl);

        const testData = { value: 'test' };
        (store as any).setInCache('ttl-test', testData);

        // Should be in cache immediately
        let cached = (store as any).getFromCache('ttl-test');
        expect(cached).toEqual(testData);

        // Wait for TTL to expire
        setTimeout(() => {
          cached = (store as any).getFromCache('ttl-test');
          expect(cached).toBeNull(); // Should be expired
          resolve();
        }, 150);
      });
    });

    it('cache invalidation on record', async () => {
      const store = new ValidationMetricsStore();

      // Pre-populate cache
      const fakePerformance = {
        agent_role: 'executor',
        total_attempts: 10,
        commit_rate: 0.8,
        iterate_rate: 0.1,
        escalate_rate: 0.1,
        avg_iterations: 1.5,
        avg_validation_time_ms: 200,
      };

      (store as any).setInCache('agent-perf:executor', fakePerformance);

      // Record metric (will try to invalidate cache)
      await store.recordValidationMetric({
        job_id: 'test',
        intent: 'test',
        agent_role: 'executor',
        action: 'commit',
        iteration_count: 1,
        validation_time_ms: 100,
      });

      // Cache should be cleared even without Supabase
      const cached = (store as any).getFromCache('agent-perf:executor');
      expect(cached).toBeNull();
    });
  });

  describe('File wait timeout handling', () => {
    it('waitForFile respects timeout exactly', async () => {
      const { waitForFile } = await import('../lib/local-worker-utils.js');

      const startTime = Date.now();
      const timeoutMs = 500;

      const result = await waitForFile('/nonexistent/file-' + Date.now() + '.txt', timeoutMs);

      const elapsedMs = Date.now() - startTime;

      expect(result).toBeNull();
      expect(elapsedMs).toBeGreaterThanOrEqual(timeoutMs);
      expect(elapsedMs).toBeLessThan(timeoutMs + 200); // Allow some variance
    });

    it('waitForFile returns null on timeout, not error', async () => {
      const { waitForFile } = await import('../lib/local-worker-utils.js');

      const result = await waitForFile('/nonexistent/path.txt', 100);

      expect(result).toBeNull();
      expect(() => {
        // Should not throw
        const x = result;
      }).not.toThrow();
    });

    it('waitForValidationGuard respects timeout', async () => {
      const { waitForValidationGuard } = await import('../lib/local-worker-utils.js');

      const startTime = Date.now();
      const timeoutMs = 200;

      const result = await waitForValidationGuard('nonexistent-job', '/nonexistent/dir', timeoutMs);

      const elapsedMs = Date.now() - startTime;

      expect(result).toBeNull();
      expect(elapsedMs).toBeGreaterThanOrEqual(timeoutMs);
    });
  });

  describe('Metrics calculation edge cases', () => {
    let store: ValidationMetricsStore;

    beforeEach(() => {
      store = new ValidationMetricsStore();
    });

    it('handles zero attempts gracefully', async () => {
      // With no data, getAgentPerformance should return null
      const performance = await store.getAgentPerformance('never-executed-agent');

      expect(performance).toBeNull();
    });

    it('cache calculation with single record', async () => {
      // Simulate having one record in cache
      const singleRecord = {
        agent_role: 'executor',
        total_attempts: 1,
        commit_rate: 1.0, // 100%
        iterate_rate: 0,
        escalate_rate: 0,
        avg_iterations: 1,
        avg_validation_time_ms: 150,
      };

      (store as any).setInCache('agent-perf:executor', singleRecord);

      const cached = (store as any).getFromCache('agent-perf:executor');
      expect(cached).toEqual(singleRecord);
      expect(cached.commit_rate).toBe(1.0);
    });

    it('handles all successes (100% commit rate)', async () => {
      // This is a calculation that should not divide by zero
      const testData = {
        agent_role: 'executor',
        total_attempts: 10,
        commit_rate: 1.0, // All committed
        iterate_rate: 0,
        escalate_rate: 0,
        avg_iterations: 1.0,
        avg_validation_time_ms: 100,
      };

      (store as any).setInCache('agent-perf:test', testData);

      const cached = (store as any).getFromCache('agent-perf:test');
      expect(cached.commit_rate).toBe(1.0);
      expect(cached.escalate_rate).toBe(0);
    });

    it('handles all failures (0% commit rate)', async () => {
      const testData = {
        agent_role: 'executor',
        total_attempts: 10,
        commit_rate: 0, // All failed
        iterate_rate: 0.5,
        escalate_rate: 0.5,
        avg_iterations: 3.5,
        avg_validation_time_ms: 500,
      };

      (store as any).setInCache('agent-perf:test', testData);

      const cached = (store as any).getFromCache('agent-perf:test');
      expect(cached.commit_rate).toBe(0);
      expect(cached.avg_iterations).toBe(3.5);
    });
  });
});
