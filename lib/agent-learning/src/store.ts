import type {
  AgentLearningProfile,
  AgentScorecard,
  CanonicalTaskId,
  EvalCase,
  EvalResult,
  ExecutionEvidence,
  LearningRecord,
  ModelPerformance,
  PromptPerformance,
  PromotionPolicy,
  ReviewDecision,
  ReviewEvidence,
  TrustLevel,
} from './types.js';
import { TRUST_LEVELS } from './types.js';
import {
  DEFAULT_DEMOTION_FAILURE_WINDOW,
  DEFAULT_DEMOTION_SUCCESS_FLOOR,
  DEFAULT_PROMOTION_POLICIES,
} from './policies.js';

export type AgentLearningStoreOptions = {
  /** When true (default), load DEFAULT_PROMOTION_POLICIES. */
  useDefaultPromotionPolicies?: boolean;
  demotionFailureWindow?: number;
  demotionSuccessFloor?: number;
};

/**
 * In-memory learning store keyed by canonical AgentTask request_id.
 * Does NOT create or own tasks — call sites must pass an existing task_id.
 */
export class AgentLearningStore {
  private readonly profiles = new Map<string, AgentLearningProfile>();
  private readonly executions = new Map<string, ExecutionEvidence>();
  private readonly reviews = new Map<string, ReviewEvidence>();
  private readonly records = new Map<string, LearningRecord>();
  private readonly evalCases = new Map<string, EvalCase>();
  private readonly evalResults: EvalResult[] = [];
  private promotionPolicies: PromotionPolicy[] = [];
  private readonly demotionFailureWindow: number;
  private readonly demotionSuccessFloor: number;

  constructor(options: AgentLearningStoreOptions = {}) {
    const useDefaults = options.useDefaultPromotionPolicies !== false;
    if (useDefaults) {
      this.promotionPolicies = DEFAULT_PROMOTION_POLICIES.map((p) => ({ ...p }));
    }
    this.demotionFailureWindow =
      options.demotionFailureWindow ?? DEFAULT_DEMOTION_FAILURE_WINDOW;
    this.demotionSuccessFloor =
      options.demotionSuccessFloor ?? DEFAULT_DEMOTION_SUCCESS_FLOOR;
  }

  registerProfile(profile: AgentLearningProfile): AgentLearningProfile {
    const next: AgentLearningProfile = {
      ...profile,
      trust_level: profile.trust_level ?? 'observe',
    };
    this.profiles.set(next.agent_id, next);
    return next;
  }

  getProfile(agentId: string): AgentLearningProfile | undefined {
    return this.profiles.get(agentId);
  }

  /**
   * Attach execution evidence to an existing canonical task id.
   * Rejects empty task_id to prevent a parallel identity space.
   */
  attachExecution(execution: ExecutionEvidence): ExecutionEvidence {
    assertCanonicalTaskId(execution.task_id);
    this.executions.set(execution.execution_id, execution);

    const agent = this.profiles.get(execution.agent_id);
    if (agent) {
      agent.task_count += 1;
      agent.avg_latency_ms =
        (agent.avg_latency_ms * (agent.task_count - 1) + execution.latency_ms) /
        agent.task_count;
      if (execution.status === 'failure') {
        agent.failure_count += 1;
        agent.last_failure_at = new Date().toISOString();
      }
    }

    return execution;
  }

  attachReview(review: ReviewEvidence): ReviewEvidence {
    assertCanonicalTaskId(review.task_id);
    const execution = this.executions.get(review.execution_id);
    if (!execution) {
      throw new Error('Execution not found for review');
    }
    if (execution.task_id !== review.task_id) {
      throw new Error('Review task_id must match execution task_id');
    }

    this.reviews.set(review.review_id, review);

    const agent = this.profiles.get(execution.agent_id);
    if (agent) {
      const approved = review.decision === 'approved' ? 1 : 0;
      agent.success_rate =
        (agent.success_rate * Math.max(agent.task_count - 1, 0) + approved) /
        Math.max(agent.task_count, 1);
      if (review.reviewer_agent) {
        agent.supervisor_agreement =
          (agent.supervisor_agreement * Math.max(agent.task_count - 1, 0) +
            review.score / 100) /
          Math.max(agent.task_count, 1);
      }
    }

    return review;
  }

  /**
   * Attach a human decision to an existing learning record (or create a thin shell).
   * Updates human_agreement on the agent profile when linked to an execution.
   */
  attachHumanDecision(input: {
    task_id: CanonicalTaskId;
    evidence_id?: string;
    decision: ReviewDecision;
    learning_lesson?: string;
  }): LearningRecord {
    assertCanonicalTaskId(input.task_id);
    const existing =
      (input.evidence_id ? this.records.get(input.evidence_id) : undefined) ??
      this.getLearningByTask(input.task_id);

    let record: LearningRecord;
    if (existing) {
      record = {
        ...existing,
        human_decision: input.decision,
        learning_lesson: input.learning_lesson ?? existing.learning_lesson,
      };
      this.records.set(record.evidence_id, record);
    } else {
      const execution = Array.from(this.executions.values()).find(
        (e) => e.task_id === input.task_id
      );
      if (!execution) {
        throw new Error('No execution found for human decision; attachExecution first');
      }
      record = {
        evidence_id: input.evidence_id ?? `human-${input.task_id}`,
        task_id: input.task_id,
        execution,
        human_decision: input.decision,
        learning_lesson: input.learning_lesson,
      };
      this.records.set(record.evidence_id, record);
    }

    const agent = this.profiles.get(record.execution.agent_id);
    if (agent) {
      const agreed = input.decision === 'approved' ? 1 : 0;
      agent.human_agreement =
        (agent.human_agreement * Math.max(agent.task_count - 1, 0) + agreed) /
        Math.max(agent.task_count, 1);
    }

    return record;
  }

  recordLearning(record: LearningRecord): LearningRecord {
    assertCanonicalTaskId(record.task_id);
    this.records.set(record.evidence_id, record);
    return record;
  }

  getLearningByTask(taskId: CanonicalTaskId): LearningRecord | undefined {
    assertCanonicalTaskId(taskId);
    return Array.from(this.records.values()).find((r) => r.task_id === taskId);
  }

  listLessons(limit = 50): Array<{ task_id: CanonicalTaskId; lesson: string }> {
    return Array.from(this.records.values())
      .filter((r): r is LearningRecord & { learning_lesson: string } =>
        Boolean(r.learning_lesson && r.learning_lesson.trim().length > 0)
      )
      .slice(-limit)
      .map((r) => ({ task_id: r.task_id, lesson: r.learning_lesson }));
  }

  registerEvalCase(evalCase: EvalCase): EvalCase {
    if (evalCase.task_id !== undefined) {
      assertCanonicalTaskId(evalCase.task_id);
    }
    this.evalCases.set(evalCase.eval_id, evalCase);
    return evalCase;
  }

  recordEvalResult(result: EvalResult): EvalResult {
    assertCanonicalTaskId(result.task_id);
    if (!this.evalCases.has(result.eval_id)) {
      throw new Error(`Unknown eval_id: ${result.eval_id}`);
    }
    this.evalResults.push(result);
    return result;
  }

  listEvalResults(datasetId?: string): EvalResult[] {
    if (!datasetId) return [...this.evalResults];
    return this.evalResults.filter((r) => r.dataset_id === datasetId);
  }

  setPromotionPolicies(policies: PromotionPolicy[]): void {
    this.promotionPolicies = policies;
  }

  getPromotionPolicies(): PromotionPolicy[] {
    return this.promotionPolicies.map((p) => ({ ...p }));
  }

  promoteIfEligible(agentId: string): boolean {
    const agent = this.profiles.get(agentId);
    if (!agent) throw new Error('Agent profile not found');

    const policy = this.promotionPolicies.find((p) => p.from_level === agent.trust_level);
    if (!policy) return false;

    // Never auto-promote into autonomous_low_risk — requires explicit human policy.
    if (policy.to_level === 'autonomous_low_risk') return false;

    const ok =
      agent.task_count >= policy.minimum_tasks &&
      agent.supervisor_agreement >= policy.min_supervisor_agreement &&
      agent.failure_count <= policy.max_critical_failures &&
      agent.success_rate >= policy.min_success_rate;

    if (!ok) return false;
    agent.trust_level = policy.to_level;
    return true;
  }

  demoteIfDegraded(agentId: string): boolean {
    const agent = this.profiles.get(agentId);
    if (!agent) throw new Error('Agent profile not found');

    const recentFailures = Array.from(this.executions.values())
      .filter((e) => e.agent_id === agentId)
      .slice(-this.demotionFailureWindow)
      .filter((e) => e.status === 'failure').length;

    const shouldDemote =
      recentFailures === this.demotionFailureWindow ||
      agent.success_rate < this.demotionSuccessFloor;
    if (!shouldDemote || agent.trust_level === 'observe') return false;

    const idx = TRUST_LEVELS.indexOf(agent.trust_level);
    if (idx <= 0) return false;
    agent.trust_level = TRUST_LEVELS[idx - 1] as TrustLevel;
    return true;
  }

  getScorecard(agentId: string): AgentScorecard | null {
    const agent = this.profiles.get(agentId);
    if (!agent) return null;
    return {
      agent_id: agent.agent_id,
      model: agent.model,
      role: agent.role,
      trust_level: agent.trust_level,
      task_count: agent.task_count,
      success_rate: agent.success_rate,
      supervisor_agreement: agent.supervisor_agreement,
      human_agreement: agent.human_agreement,
      avg_latency_ms: agent.avg_latency_ms,
      failure_count: agent.failure_count,
      last_failure_at: agent.last_failure_at,
      capabilities: agent.capabilities,
    };
  }

  getPromptPerformance(promptVersion?: string): PromptPerformance[] {
    const byVersion = new Map<
      string,
      { samples: number; successes: number; latency: number; reviewScore: number; reviews: number }
    >();

    for (const execution of this.executions.values()) {
      const key = execution.prompt_version;
      const bucket = byVersion.get(key) ?? {
        samples: 0,
        successes: 0,
        latency: 0,
        reviewScore: 0,
        reviews: 0,
      };
      bucket.samples += 1;
      if (execution.status === 'success') bucket.successes += 1;
      bucket.latency += execution.latency_ms;
      byVersion.set(key, bucket);
    }

    for (const review of this.reviews.values()) {
      const execution = this.executions.get(review.execution_id);
      if (!execution) continue;
      const bucket = byVersion.get(execution.prompt_version);
      if (!bucket) continue;
      bucket.reviewScore += review.score;
      bucket.reviews += 1;
    }

    const rows: PromptPerformance[] = [];
    for (const [version, bucket] of byVersion.entries()) {
      if (promptVersion !== undefined && version !== promptVersion) continue;
      rows.push({
        prompt_version: version,
        samples: bucket.samples,
        success_rate: bucket.samples === 0 ? 0 : bucket.successes / bucket.samples,
        avg_latency_ms: bucket.samples === 0 ? 0 : bucket.latency / bucket.samples,
        avg_review_score: bucket.reviews === 0 ? 0 : bucket.reviewScore / bucket.reviews,
      });
    }
    return rows.sort((a, b) => a.prompt_version.localeCompare(b.prompt_version));
  }

  getModelPerformance(model?: string): ModelPerformance[] {
    const byModel = new Map<
      string,
      { samples: number; successes: number; latency: number; reviewScore: number; reviews: number }
    >();

    for (const execution of this.executions.values()) {
      const key = execution.model;
      const bucket = byModel.get(key) ?? {
        samples: 0,
        successes: 0,
        latency: 0,
        reviewScore: 0,
        reviews: 0,
      };
      bucket.samples += 1;
      if (execution.status === 'success') bucket.successes += 1;
      bucket.latency += execution.latency_ms;
      byModel.set(key, bucket);
    }

    for (const review of this.reviews.values()) {
      const execution = this.executions.get(review.execution_id);
      if (!execution) continue;
      const bucket = byModel.get(execution.model);
      if (!bucket) continue;
      bucket.reviewScore += review.score;
      bucket.reviews += 1;
    }

    const rows: ModelPerformance[] = [];
    for (const [modelName, bucket] of byModel.entries()) {
      if (model !== undefined && modelName !== model) continue;
      rows.push({
        model: modelName,
        samples: bucket.samples,
        success_rate: bucket.samples === 0 ? 0 : bucket.successes / bucket.samples,
        avg_latency_ms: bucket.samples === 0 ? 0 : bucket.latency / bucket.samples,
        avg_review_score: bucket.reviews === 0 ? 0 : bucket.reviewScore / bucket.reviews,
      });
    }
    return rows.sort((a, b) => a.model.localeCompare(b.model));
  }
}

export function assertCanonicalTaskId(taskId: string): asserts taskId is CanonicalTaskId {
  if (typeof taskId !== 'string' || taskId.trim().length === 0) {
    throw new Error(
      'Agent Lab requires canonical task_id (= AgentTaskEnvelopeV1.request_id). Refusing empty/independent identity.'
    );
  }
}

/**
 * Extract task_id from an envelope-like object. Prefer AgentTaskEnvelopeV1.request_id.
 */
export function taskIdFromEnvelope(envelope: { request_id: string }): CanonicalTaskId {
  assertCanonicalTaskId(envelope.request_id);
  return envelope.request_id;
}

/** Hard guard: learning layer must never mint a task identity of its own. */
export function refuseIndependentTaskCreation(): never {
  throw new Error(
    'Agent Lab cannot create canonical tasks. Use agent-task-core assignAgentTask / AgentTaskEnvelopeV1.'
  );
}
