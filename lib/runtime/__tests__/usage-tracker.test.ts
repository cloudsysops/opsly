/**
 * Tests for Usage Tracker
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { UsageTracker } from '../usage-tracker';

describe('usage-tracker', () => {
  let tracker: UsageTracker;

  beforeEach(() => {
    tracker = new UsageTracker({ monthlyBudgetUsd: 100 });
  });

  describe('record', () => {
    it('should record a usage entry', async () => {
      await tracker.record({
        workerType: 'local',
        jobId: 'job_1',
        tokensUsed: 1000,
        costUsd: 0,
        executionTimeMs: 500,
        success: true,
      });

      const recent = tracker.getRecentRecords();
      expect(recent).toHaveLength(1);
      expect(recent[0].jobId).toBe('job_1');
    });

    it('should invoke onRecord callback when provided', async () => {
      let captured: unknown = null;
      const withCallback = new UsageTracker({ monthlyBudgetUsd: 100 }, record => {
        captured = record;
      });

      await withCallback.record({
        workerType: 'remote',
        jobId: 'job_2',
        tokensUsed: 500,
        costUsd: 0.5,
        executionTimeMs: 200,
        success: true,
      });

      expect(captured).not.toBeNull();
      expect((captured as { jobId: string }).jobId).toBe('job_2');
    });
  });

  describe('getBudgetStatus', () => {
    it('should aggregate cost across workers', async () => {
      await tracker.record({
        workerType: 'remote',
        jobId: 'job_1',
        tokensUsed: 1000,
        costUsd: 1,
        executionTimeMs: 100,
        success: true,
      });
      await tracker.record({
        workerType: 'local',
        jobId: 'job_2',
        tokensUsed: 500,
        costUsd: 0,
        executionTimeMs: 100,
        success: true,
      });

      const status = tracker.getBudgetStatus();

      expect(status.spentUsd).toBe(1);
      expect(status.remainingUsd).toBe(99);
      expect(status.byWorker).toHaveLength(2);
    });

    it('should warn when budget remaining is low', async () => {
      const tightTracker = new UsageTracker({ monthlyBudgetUsd: 1 });
      await tightTracker.record({
        workerType: 'remote',
        jobId: 'job_1',
        tokensUsed: 9000,
        costUsd: 0.9,
        executionTimeMs: 100,
        success: true,
      });

      const status = tightTracker.getBudgetStatus();

      expect(status.remainingPercentage).toBeLessThan(20);
      expect(status.recommendations.some(r => r.includes('riesgo'))).toBe(true);
    });

    it('should track failed jobs separately from completed', async () => {
      await tracker.record({
        workerType: 'local',
        jobId: 'job_fail',
        tokensUsed: 0,
        costUsd: 0,
        executionTimeMs: 50,
        success: false,
      });

      const status = tracker.getBudgetStatus();
      const localSummary = status.byWorker.find(w => w.workerType === 'local');

      expect(localSummary?.jobsFailed).toBe(1);
      expect(localSummary?.jobsCompleted).toBe(0);
      expect(localSummary?.successRate).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all records', async () => {
      await tracker.record({
        workerType: 'local',
        jobId: 'job_1',
        tokensUsed: 100,
        costUsd: 0,
        executionTimeMs: 10,
        success: true,
      });

      tracker.reset();

      expect(tracker.getRecentRecords()).toHaveLength(0);
    });
  });
});
