import { describe, it, expect, beforeEach } from 'vitest';
import {
  createApprovalQueue,
  type ApprovalQueueConfig,
  type ApprovalTask,
} from '../content-approval-queue.js';
import type { ContentDraft } from '../../types.js';

describe('ContentApprovalQueue', () => {
  let queue: ReturnType<typeof createApprovalQueue>;
  let config: ApprovalQueueConfig;

  const mockDraft: Partial<ContentDraft> = {
    id: 'draft-123',
    tenant_slug: 'test-tenant',
    title: 'Test Draft',
    story_hook: 'Test story',
    call_to_action: 'Learn more',
    state: 'draft',
  };

  beforeEach(() => {
    config = {
      redisUrl: 'redis://localhost:6379',
      queueName: 'content-approval',
      maxRetries: 3,
      processingTimeoutMs: 30000,
    };

    queue = createApprovalQueue(config);
  });

  describe('enqueueForApproval', () => {
    it('should enqueue a draft for approval', async () => {
      const task = await queue.enqueueForApproval(mockDraft);

      expect(task.id).toContain('approval-');
      expect(task.draft_id).toBe('draft-123');
      expect(task.tenant_slug).toBe('test-tenant');
      expect(task.state).toBe('pending_approval');
      expect(task.created_at).toBeTruthy();
    });

    it('should throw error if draft missing id', async () => {
      const invalidDraft: Partial<ContentDraft> = {
        ...mockDraft,
        id: undefined,
      };

      await expect(queue.enqueueForApproval(invalidDraft)).rejects.toThrow(
        'Draft must have id and tenant_slug',
      );
    });

    it('should throw error if draft missing tenant_slug', async () => {
      const invalidDraft: Partial<ContentDraft> = {
        ...mockDraft,
        tenant_slug: undefined,
      };

      await expect(queue.enqueueForApproval(invalidDraft)).rejects.toThrow(
        'Draft must have id and tenant_slug',
      );
    });
  });

  describe('approveDraft', () => {
    it('should approve a pending draft', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      const approved = await queue.approveDraft(task.id, 'reviewer@example.com');

      expect(approved.state).toBe('approved');
      expect(approved.reviewed_by).toBe('reviewer@example.com');
      expect(approved.reviewed_at).toBeTruthy();
    });

    it('should throw error if task not found', async () => {
      await expect(
        queue.approveDraft('nonexistent-id', 'reviewer@example.com'),
      ).rejects.toThrow('Task not found');
    });

    it('should throw error if task not in pending_approval state', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');

      await expect(
        queue.approveDraft(task.id, 'reviewer@example.com'),
      ).rejects.toThrow('Cannot approve task in approved state');
    });
  });

  describe('rejectDraft', () => {
    it('should reject a pending draft', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      const rejected = await queue.rejectDraft(
        task.id,
        'reviewer@example.com',
        'Contains sensitive information',
      );

      expect(rejected.state).toBe('rejected');
      expect(rejected.reviewed_by).toBe('reviewer@example.com');
      expect(rejected.rejection_reason).toBe('Contains sensitive information');
      expect(rejected.reviewed_at).toBeTruthy();
    });

    it('should throw error if task not in pending_approval state', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');

      await expect(
        queue.rejectDraft(task.id, 'reviewer@example.com', 'Not approved'),
      ).rejects.toThrow('Cannot reject task in approved state');
    });
  });

  describe('transitionToReady', () => {
    it('should transition approved draft to ready_to_copy', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');
      const ready = await queue.transitionToReady(task.id);

      expect(ready.state).toBe('ready_to_copy');
    });

    it('should throw error if task not approved', async () => {
      const task = await queue.enqueueForApproval(mockDraft);

      await expect(queue.transitionToReady(task.id)).rejects.toThrow(
        'Cannot transition to ready from pending_approval state',
      );
    });
  });

  describe('schedulePublish', () => {
    it('should schedule approved draft for publishing', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');
      const scheduled = await queue.schedulePublish(
        task.id,
        '2024-12-25T09:00:00Z',
      );

      expect(scheduled.state).toBe('scheduled');
      expect(scheduled.scheduled_for).toBe('2024-12-25T09:00:00Z');
    });

    it('should schedule ready_to_copy draft for publishing', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');
      await queue.transitionToReady(task.id);
      const scheduled = await queue.schedulePublish(
        task.id,
        '2024-12-25T09:00:00Z',
      );

      expect(scheduled.state).toBe('scheduled');
    });

    it('should throw error if task not in approved or ready state', async () => {
      const task = await queue.enqueueForApproval(mockDraft);

      await expect(
        queue.schedulePublish(task.id, '2024-12-25T09:00:00Z'),
      ).rejects.toThrow('Cannot schedule from pending_approval state');
    });
  });

  describe('markPublished', () => {
    it('should mark scheduled draft as published', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');
      await queue.schedulePublish(task.id, '2024-12-25T09:00:00Z');
      const published = await queue.markPublished(task.id);

      expect(published.state).toBe('published');
      expect(published.completed_at).toBeTruthy();
    });
  });

  describe('getTask', () => {
    it('should retrieve a task by id', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      const retrieved = await queue.getTask(task.id);

      expect(retrieved?.id).toBe(task.id);
      expect(retrieved?.draft_id).toBe('draft-123');
    });

    it('should return undefined for nonexistent task', async () => {
      const retrieved = await queue.getTask('nonexistent-id');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('listPendingApprovals', () => {
    it('should list all pending approvals for tenant', async () => {
      const task1 = await queue.enqueueForApproval(mockDraft);
      const task2 = await queue.enqueueForApproval({
        ...mockDraft,
        id: 'draft-124',
      });
      await queue.approveDraft(task2.id, 'reviewer@example.com');

      const pending = await queue.listPendingApprovals('test-tenant');

      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe(task1.id);
    });

    it('should return empty list if no pending approvals', async () => {
      const pending = await queue.listPendingApprovals('test-tenant');

      expect(pending).toHaveLength(0);
    });

    it('should filter by tenant', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      const pending1 = await queue.listPendingApprovals('test-tenant');
      const pending2 = await queue.listPendingApprovals('other-tenant');

      expect(pending1).toHaveLength(1);
      expect(pending2).toHaveLength(0);
    });
  });

  describe('listByState', () => {
    it('should list tasks by state', async () => {
      const task1 = await queue.enqueueForApproval(mockDraft);
      const task2 = await queue.enqueueForApproval({
        ...mockDraft,
        id: 'draft-124',
      });

      await queue.approveDraft(task2.id, 'reviewer@example.com');

      const pending = await queue.listByState(
        'test-tenant',
        'pending_approval',
      );
      const approved = await queue.listByState('test-tenant', 'approved');

      expect(pending).toHaveLength(1);
      expect(approved).toHaveLength(1);
    });
  });

  describe('listTenantTasks', () => {
    it('should list all tasks for tenant', async () => {
      const task1 = await queue.enqueueForApproval(mockDraft);
      const task2 = await queue.enqueueForApproval({
        ...mockDraft,
        id: 'draft-124',
      });

      const tasks = await queue.listTenantTasks('test-tenant');

      expect(tasks).toHaveLength(2);
    });

    it('should return empty list for unknown tenant', async () => {
      const tasks = await queue.listTenantTasks('unknown-tenant');

      expect(tasks).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return queue statistics', async () => {
      const task1 = await queue.enqueueForApproval(mockDraft);
      const task2 = await queue.enqueueForApproval({
        ...mockDraft,
        id: 'draft-124',
      });
      const task3 = await queue.enqueueForApproval({
        ...mockDraft,
        id: 'draft-125',
      });

      await queue.approveDraft(task2.id, 'reviewer@example.com');
      await queue.rejectDraft(task3.id, 'reviewer@example.com', 'Rejected');

      const stats = queue.getStats();

      expect(stats.totalTasks).toBe(3);
      expect(stats.byState.pending_approval).toBe(1);
      expect(stats.byState.approved).toBe(1);
      expect(stats.byState.rejected).toBe(1);
    });

    it('should track all state transitions', async () => {
      const task = await queue.enqueueForApproval(mockDraft);
      await queue.approveDraft(task.id, 'reviewer@example.com');
      await queue.transitionToReady(task.id);
      await queue.schedulePublish(task.id, '2024-12-25T09:00:00Z');
      await queue.markPublished(task.id);

      const stats = queue.getStats();

      expect(stats.byState.published).toBe(1);
    });
  });

  describe('Workflow: Complete approval cycle', () => {
    it('should handle complete draft approval workflow', async () => {
      const draft = await queue.enqueueForApproval(mockDraft);
      expect(draft.state).toBe('pending_approval');

      const approved = await queue.approveDraft(
        draft.id,
        'reviewer@example.com',
      );
      expect(approved.state).toBe('approved');

      const ready = await queue.transitionToReady(draft.id);
      expect(ready.state).toBe('ready_to_copy');

      const scheduled = await queue.schedulePublish(
        draft.id,
        '2024-12-25T09:00:00Z',
      );
      expect(scheduled.state).toBe('scheduled');

      const published = await queue.markPublished(draft.id);
      expect(published.state).toBe('published');
      expect(published.completed_at).toBeTruthy();
    });

    it('should handle rejection workflow', async () => {
      const draft = await queue.enqueueForApproval(mockDraft);
      const rejected = await queue.rejectDraft(
        draft.id,
        'reviewer@example.com',
        'Contains PII',
      );

      expect(rejected.state).toBe('rejected');
      expect(rejected.rejection_reason).toBe('Contains PII');
    });
  });
});
