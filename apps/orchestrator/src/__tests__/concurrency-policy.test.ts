import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getDynamicConcurrency,
  CONCURRENCY_POLICIES,
  ConcurrencyManager,
  SystemMetrics,
} from '../queue/concurrency-policy';

describe('Concurrency Policy', () => {
  describe('getDynamicConcurrency', () => {
    it('should return base concurrency when system is healthy', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 30,
        memoryUsage: 40,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'startup', metrics);
      expect(result).toBe(CONCURRENCY_POLICIES.startup.baseWorkerConcurrency);
    });

    it('should reduce concurrency when CPU exceeds threshold', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 85,
        memoryUsage: 40,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'startup', metrics);
      expect(result).toBeLessThan(CONCURRENCY_POLICIES.startup.baseWorkerConcurrency);
      expect(result).toBeGreaterThanOrEqual(CONCURRENCY_POLICIES.startup.minConcurrency);
    });

    it('should reduce concurrency when memory exceeds threshold', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 40,
        memoryUsage: 85,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'startup', metrics);
      expect(result).toBeLessThan(CONCURRENCY_POLICIES.startup.baseWorkerConcurrency);
      expect(result).toBeGreaterThanOrEqual(CONCURRENCY_POLICIES.startup.minConcurrency);
    });

    it('should respect minimum concurrency', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 99,
        memoryUsage: 99,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'startup', metrics);
      expect(result).toBe(CONCURRENCY_POLICIES.startup.minConcurrency);
    });

    it('should use enterprise policy for enterprise plan', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 30,
        memoryUsage: 40,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'enterprise', metrics);
      expect(result).toBe(CONCURRENCY_POLICIES.enterprise.baseWorkerConcurrency);
    });

    it('should use business policy for business plan', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 30,
        memoryUsage: 40,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'business', metrics);
      expect(result).toBe(CONCURRENCY_POLICIES.business.baseWorkerConcurrency);
    });

    it('should handle high CPU and high memory together', async () => {
      const metrics: SystemMetrics = {
        cpuUsage: 90,
        memoryUsage: 90,
        activeConnections: 0,
        timestamp: new Date(),
      };

      const result = await getDynamicConcurrency('test-worker', 'enterprise', metrics);
      expect(result).toBeLessThan(CONCURRENCY_POLICIES.enterprise.baseWorkerConcurrency);
      expect(result).toBeGreaterThanOrEqual(CONCURRENCY_POLICIES.enterprise.minConcurrency);
    });
  });

  describe('ConcurrencyManager', () => {
    let manager: ConcurrencyManager;

    beforeEach(() => {
      manager = new ConcurrencyManager();
    });

    it('should initialize with default policies', () => {
      const policy = manager.getPolicy('startup');
      expect(policy).toEqual(CONCURRENCY_POLICIES.startup);
    });

    it('should add custom policies', () => {
      const customPolicy = {
        plan: 'custom' as const,
        baseWorkerConcurrency: 7,
        cpuThreshold: 72,
        memoryThreshold: 78,
        maxBurst: 10,
        minConcurrency: 3,
      };

      manager.addPolicy('custom', customPolicy);
      const policy = manager.getPolicy('custom');
      expect(policy.baseWorkerConcurrency).toBe(7);
    });

    it('should track worker concurrency', () => {
      manager.setWorkerConcurrency('worker-1', 5);
      expect(manager.getWorkerConcurrency('worker-1')).toBe(5);
    });

    it('should return default concurrency for unknown worker', () => {
      const concurrency = manager.getWorkerConcurrency('unknown-worker');
      expect(concurrency).toBe(2);
    });

    it('should return all worker concurrency', () => {
      manager.setWorkerConcurrency('worker-1', 5);
      manager.setWorkerConcurrency('worker-2', 3);

      const allConcurrency = manager.getAllWorkerConcurrency();
      expect(allConcurrency.size).toBe(2);
      expect(allConcurrency.get('worker-1')).toBe(5);
      expect(allConcurrency.get('worker-2')).toBe(3);
    });

    it('should calculate concurrency based on system metrics', async () => {
      const concurrency = await manager.calculateConcurrency(
        'test-worker',
        'startup'
      );
      expect(concurrency).toBeGreaterThanOrEqual(1);
      expect(concurrency).toBeLessThanOrEqual(10);
    });

    it('should store system metrics', async () => {
      await manager.calculateConcurrency('test-worker', 'startup');
      const metrics = manager.getSystemMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.cpuUsage).toBeDefined();
      expect(metrics?.memoryUsage).toBeDefined();
    });

    it('should handle concurrency watcher startup and stop', (done) => {
      const onConcurrencyChange = vi.fn();

      manager.setWorkerConcurrency('test-worker', 2);
      manager.startConcurrencyWatcher(100, onConcurrencyChange);

      setTimeout(() => {
        manager.stopConcurrencyWatcher();
        done();
      }, 300);
    });

    it('should not start multiple watchers', () => {
      manager.setWorkerConcurrency('test-worker', 2);
      manager.startConcurrencyWatcher(100);
      const interval1 = (manager as any).updateInterval;

      manager.startConcurrencyWatcher(100);
      const interval2 = (manager as any).updateInterval;

      expect(interval1).toBe(interval2);
      manager.stopConcurrencyWatcher();
    });
  });

  describe('Policy Thresholds', () => {
    it('startup plan should have lower thresholds than business', () => {
      const startup = CONCURRENCY_POLICIES.startup;
      const business = CONCURRENCY_POLICIES.business;

      expect(startup.cpuThreshold).toBeLessThan(business.cpuThreshold);
      expect(startup.memoryThreshold).toBeLessThan(business.memoryThreshold);
      expect(startup.baseWorkerConcurrency).toBeLessThan(
        business.baseWorkerConcurrency
      );
    });

    it('business plan should have lower thresholds than enterprise', () => {
      const business = CONCURRENCY_POLICIES.business;
      const enterprise = CONCURRENCY_POLICIES.enterprise;

      expect(business.cpuThreshold).toBeLessThan(enterprise.cpuThreshold);
      expect(business.memoryThreshold).toBeLessThan(enterprise.memoryThreshold);
      expect(business.baseWorkerConcurrency).toBeLessThan(
        enterprise.baseWorkerConcurrency
      );
    });

    it('all plans should have minConcurrency >= 1', () => {
      Object.values(CONCURRENCY_POLICIES).forEach((policy) => {
        expect(policy.minConcurrency).toBeGreaterThanOrEqual(1);
      });
    });

    it('all plans should have maxBurst > baseWorkerConcurrency', () => {
      Object.values(CONCURRENCY_POLICIES).forEach((policy) => {
        expect(policy.maxBurst).toBeGreaterThan(policy.baseWorkerConcurrency);
      });
    });
  });
});
