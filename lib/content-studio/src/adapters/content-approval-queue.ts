import type { ContentDraft } from '../types.js';

export type ApprovalState =
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'ready_to_copy'
  | 'scheduled'
  | 'published';

export interface ApprovalTask {
  id: string;
  draft_id: string;
  tenant_slug: string;
  state: ApprovalState;
  created_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  scheduled_for?: string;
  completed_at?: string;
}

export interface ApprovalQueueConfig {
  redisUrl: string;
  queueName: string;
  maxRetries: number;
  processingTimeoutMs: number;
}

export class ContentApprovalQueue {
  private config: ApprovalQueueConfig;
  private tasks: Map<string, ApprovalTask> = new Map();

  constructor(config: ApprovalQueueConfig) {
    this.config = config;
  }

  async enqueueForApproval(
    draft: Partial<ContentDraft>,
  ): Promise<ApprovalTask> {
    if (!draft.id || !draft.tenant_slug) {
      throw new Error('Draft must have id and tenant_slug');
    }

    const task: ApprovalTask = {
      id: `approval-${draft.id}`,
      draft_id: draft.id,
      tenant_slug: draft.tenant_slug,
      state: 'pending_approval',
      created_at: new Date().toISOString(),
    };

    this.tasks.set(task.id, task);

    return task;
  }

  async approveDraft(
    taskId: string,
    reviewedBy: string,
  ): Promise<ApprovalTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.state !== 'pending_approval') {
      throw new Error(
        `Cannot approve task in ${task.state} state. Must be pending_approval`,
      );
    }

    task.state = 'approved';
    task.reviewed_at = new Date().toISOString();
    task.reviewed_by = reviewedBy;

    this.tasks.set(taskId, task);

    return task;
  }

  async rejectDraft(
    taskId: string,
    reviewedBy: string,
    reason: string,
  ): Promise<ApprovalTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.state !== 'pending_approval') {
      throw new Error(
        `Cannot reject task in ${task.state} state. Must be pending_approval`,
      );
    }

    task.state = 'rejected';
    task.reviewed_at = new Date().toISOString();
    task.reviewed_by = reviewedBy;
    task.rejection_reason = reason;

    this.tasks.set(taskId, task);

    return task;
  }

  async transitionToReady(taskId: string): Promise<ApprovalTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.state !== 'approved') {
      throw new Error(
        `Cannot transition to ready from ${task.state} state. Must be approved`,
      );
    }

    task.state = 'ready_to_copy';

    this.tasks.set(taskId, task);

    return task;
  }

  async schedulePublish(
    taskId: string,
    scheduledFor: string,
  ): Promise<ApprovalTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (!['approved', 'ready_to_copy'].includes(task.state)) {
      throw new Error(
        `Cannot schedule from ${task.state} state. Must be approved or ready_to_copy`,
      );
    }

    task.state = 'scheduled';
    task.scheduled_for = scheduledFor;

    this.tasks.set(taskId, task);

    return task;
  }

  async markPublished(taskId: string): Promise<ApprovalTask> {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    task.state = 'published';
    task.completed_at = new Date().toISOString();

    this.tasks.set(taskId, task);

    return task;
  }

  async getTask(taskId: string): Promise<ApprovalTask | undefined> {
    return this.tasks.get(taskId);
  }

  async listPendingApprovals(
    tenantSlug: string,
  ): Promise<ApprovalTask[]> {
    return Array.from(this.tasks.values()).filter(
      (task) =>
        task.tenant_slug === tenantSlug &&
        task.state === 'pending_approval',
    );
  }

  async listByState(
    tenantSlug: string,
    state: ApprovalState,
  ): Promise<ApprovalTask[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.tenant_slug === tenantSlug && task.state === state,
    );
  }

  async listTenantTasks(tenantSlug: string): Promise<ApprovalTask[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.tenant_slug === tenantSlug,
    );
  }

  getStats() {
    return {
      totalTasks: this.tasks.size,
      byState: {
        pending_approval: Array.from(this.tasks.values()).filter(
          (t) => t.state === 'pending_approval',
        ).length,
        approved: Array.from(this.tasks.values()).filter(
          (t) => t.state === 'approved',
        ).length,
        rejected: Array.from(this.tasks.values()).filter(
          (t) => t.state === 'rejected',
        ).length,
        ready_to_copy: Array.from(this.tasks.values()).filter(
          (t) => t.state === 'ready_to_copy',
        ).length,
        scheduled: Array.from(this.tasks.values()).filter(
          (t) => t.state === 'scheduled',
        ).length,
        published: Array.from(this.tasks.values()).filter(
          (t) => t.state === 'published',
        ).length,
      },
    };
  }
}

export function createApprovalQueue(
  config: ApprovalQueueConfig,
): ContentApprovalQueue {
  return new ContentApprovalQueue(config);
}
