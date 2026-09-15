import { describe, expect, it } from 'vitest';
import {
  AgentLearningStore,
  DEFAULT_PROMOTION_POLICIES,
  assertCanonicalTaskId,
  refuseIndependentTaskCreation,
  taskIdFromEnvelope,
} from './index.js';

describe('agent-learning', () => {
  it('refuses independent canonical task creation', () => {
    expect(() => refuseIndependentTaskCreation()).toThrow(/cannot create canonical tasks/i);
  });

  it('maps envelope.request_id as canonical task_id', () => {
    expect(taskIdFromEnvelope({ request_id: 'req-xyz' })).toBe('req-xyz');
    expect(() => taskIdFromEnvelope({ request_id: '' })).toThrow(/canonical task_id/i);
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

  it('loads default promotion policies', () => {
    const store = new AgentLearningStore();
    expect(store.getPromotionPolicies()).toHaveLength(DEFAULT_PROMOTION_POLICIES.length);
    expect(store.getPromotionPolicies()[0]?.from_level).toBe('observe');
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

    store.attachHumanDecision({
      task_id: taskId,
      evidence_id: 'ev-1',
      decision: 'approved',
    });

    expect(store.getLearningByTask(taskId)?.task_id).toBe(taskId);
    expect(store.getLearningByTask(taskId)?.human_decision).toBe('approved');
    expect(store.getScorecard('video-review-qwen')?.task_count).toBe(1);
    expect(store.getProfile('video-review-qwen')?.trust_level).toBe('observe');
    expect(store.listLessons()).toEqual([
      { task_id: taskId, lesson: 'prefer short clips' },
    ]);
  });

  it('promotes via default policy and demotes from measured thresholds', () => {
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

  it('tracks prompt and model performance plus eval datasets', () => {
    const store = new AgentLearningStore({ useDefaultPromotionPolicies: false });
    store.registerProfile({
      agent_id: 'worker-1',
      model: 'qwen3:8b',
      role: 'worker',
      capabilities: ['caption'],
      trust_level: 'observe',
      task_count: 0,
      success_rate: 0,
      supervisor_agreement: 0,
      human_agreement: 0,
      avg_latency_ms: 0,
      failure_count: 0,
    });

    store.attachExecution({
      execution_id: 'e1',
      task_id: 'req-1',
      agent_id: 'worker-1',
      model: 'qwen3:8b',
      prompt_version: 'caption-v1',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      latency_ms: 100,
      output: null,
      status: 'success',
    });
    store.attachExecution({
      execution_id: 'e2',
      task_id: 'req-2',
      agent_id: 'worker-1',
      model: 'qwen3:14b',
      prompt_version: 'caption-v2',
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      latency_ms: 200,
      output: null,
      status: 'failure',
    });
    store.attachReview({
      review_id: 'r1',
      task_id: 'req-1',
      execution_id: 'e1',
      reviewed_at: new Date().toISOString(),
      decision: 'approved',
      findings: [],
      score: 80,
    });

    expect(store.getPromptPerformance('caption-v1')[0]?.success_rate).toBe(1);
    expect(store.getPromptPerformance('caption-v1')[0]?.avg_review_score).toBe(80);
    expect(store.getModelPerformance('qwen3:8b')[0]?.samples).toBe(1);
    expect(store.getModelPerformance()).toHaveLength(2);

    store.registerEvalCase({
      eval_id: 'case-1',
      dataset_id: 'holdout-highlights',
      task_id: 'req-1',
      objective: 'pick best clip',
      tags: ['video'],
      created_at: new Date().toISOString(),
    });
    store.recordEvalResult({
      eval_id: 'case-1',
      dataset_id: 'holdout-highlights',
      task_id: 'req-1',
      agent_id: 'worker-1',
      model: 'qwen3:8b',
      prompt_version: 'caption-v1',
      score: 0.9,
      passed: true,
      recorded_at: new Date().toISOString(),
    });
    expect(store.listEvalResults('holdout-highlights')).toHaveLength(1);
  });
});
