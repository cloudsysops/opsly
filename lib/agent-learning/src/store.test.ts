import { describe, expect, it } from 'vitest';
import {
  AgentLearningStore,
  assertCanonicalTaskId,
  refuseIndependentTaskCreation,
} from './index.js';

describe('agent-learning', () => {
  it('refuses independent canonical task creation', () => {
    expect(() => refuseIndependentTaskCreation()).toThrow(/cannot create canonical tasks/i);
  });

  it('rejects empty task_id (no parallel identity)', () => {
    expect(() => assertCanonicalTaskId('')).toThrow(/canonical task_id/i);
    const store = new AgentLearningStore();
    expect(() =>
      store.attachExecution({
        execution_id: 'exe-1',
        task_id: '   ',
        agent_id: 'a1',
        model: 'qwen3:8b',
        prompt_version: '1',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        latency_ms: 10,
        output: null,
        status: 'success',
      })
    ).toThrow(/canonical task_id/i);
  });

  it('attaches evidence and review to a canonical request_id', () => {
    const store = new AgentLearningStore();
    store.registerProfile({
      agent_id: 'video-review-qwen',
      model: 'qwen3:14b',
      role: 'reviewer',
      capabilities: ['video.review'],
      trust_level: 'observe',
      task_count: 0,
      success_rate: 0,
      supervisor_agreement: 0,
      human_agreement: 0,
      avg_latency_ms: 0,
      failure_count: 0,
    });

    const taskId = 'req-canonical-abc';
    const execution = store.attachExecution({
      execution_id: 'exe-1',
      task_id: taskId,
      agent_id: 'video-review-qwen',
      model: 'qwen3:14b',
      prompt_version: '1.0.0',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      latency_ms: 42,
      output: { ok: true },
      status: 'success',
    });

    store.attachReview({
      review_id: 'rev-1',
      task_id: taskId,
      execution_id: 'exe-1',
      reviewer_agent: 'codex',
      reviewed_at: new Date().toISOString(),
      decision: 'approved',
      findings: [],
      score: 92,
    });

    store.recordLearning({
      evidence_id: 'ev-1',
      task_id: taskId,
      execution,
      learning_lesson: 'prefer short clips',
      trust_delta: 0.02,
    });

    expect(store.getLearningByTask(taskId)?.task_id).toBe(taskId);
    expect(store.getScorecard('video-review-qwen')?.task_count).toBe(1);
    expect(store.getProfile('video-review-qwen')?.trust_level).toBe('observe');
  });

  it('promotes and demotes from measured thresholds', () => {
    const store = new AgentLearningStore();
    store.registerProfile({
      agent_id: 'a1',
      model: 'qwen3:8b',
      role: 'worker',
      capabilities: ['caption'],
      trust_level: 'supervised',
      task_count: 30,
      success_rate: 0.95,
      supervisor_agreement: 0.92,
      human_agreement: 0.9,
      avg_latency_ms: 100,
      failure_count: 0,
    });
    store.setPromotionPolicies([
      {
        from_level: 'supervised',
        to_level: 'trusted',
        minimum_tasks: 30,
        min_supervisor_agreement: 0.9,
        max_critical_failures: 0,
        min_success_rate: 0.9,
      },
    ]);
    expect(store.promoteIfEligible('a1')).toBe(true);
    expect(store.getProfile('a1')?.trust_level).toBe('trusted');

    const demote = new AgentLearningStore();
    demote.registerProfile({
      agent_id: 'a2',
      model: 'qwen3:8b',
      role: 'worker',
      capabilities: ['caption'],
      trust_level: 'trusted',
      task_count: 10,
      success_rate: 0.5,
      supervisor_agreement: 0.5,
      human_agreement: 0.5,
      avg_latency_ms: 100,
      failure_count: 5,
    });
    expect(demote.demoteIfDegraded('a2')).toBe(true);
    expect(demote.getProfile('a2')?.trust_level).toBe('supervised');
  });
});
