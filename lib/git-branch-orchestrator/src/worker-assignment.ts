import type { GitBranchPolicy } from './types.js';

export type TaskType =
  | 'architecture'
  | 'planning'
  | 'implementation'
  | 'debugging'
  | 'ui'
  | 'docs'
  | 'tests'
  | 'small_patch'
  | 'review'
  | 'security_review';

export function normalizeTaskType(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, '_');
}

/** Select external registry worker_id from task type (no new agent brains). */
export function workerIdForTaskType(policy: GitBranchPolicy, taskType: string): string {
  const key = normalizeTaskType(taskType);
  const workerId = policy.task_type_workers[key];
  if (workerId) {
    return workerId;
  }
  if (key.includes('arch') || key.includes('plan')) {
    return policy.task_type_workers.architecture ?? 'claude-code';
  }
  if (key.includes('review') || key.includes('audit')) {
    return policy.task_type_workers.review ?? 'hermes-cli';
  }
  if (key.includes('ui') || key.includes('doc') || key.includes('test')) {
    return policy.task_type_workers.ui ?? 'copilot-cli';
  }
  return policy.task_type_workers.implementation ?? 'opencode';
}

export function riskLevelForTaskType(taskType: string): 'low' | 'medium' | 'high' {
  const key = normalizeTaskType(taskType);
  if (key === 'security_review' || key === 'architecture') {
    return 'high';
  }
  if (key === 'implementation' || key === 'debugging') {
    return 'medium';
  }
  return 'low';
}
