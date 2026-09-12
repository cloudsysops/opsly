import type {
  AgentLearningProfile,
  AgentLearningSnapshot,
  CanonicalTaskId,
  ExecutionEvidence,
  LearningRecord,
  PromotionPolicy,
  ReviewEvidence,
  TrustLevel,
} from './types.js';
import { TRUST_LEVELS } from './types.js';

/**
 * In-memory learning store keyed by canonical AgentTask request_id.
 * Does NOT create or own tasks — call sites must pass an existing task_id.
 */
export class AgentLearningStore {
  private readonly profiles = new Map<string, AgentLearningProfile>();
  private readonly executions = new Map<string, ExecutionEvidence>();
  private readonly reviews = new Map<string, ReviewEvidence>();
  private readonly records = new Map<string, LearningRecord>();
  private promotionPolicies: PromotionPolicy[] = [];

  registerProfile(profile: AgentLearningProfile): AgentLearningProfile {
    const next: AgentLearningProfile = {
      ...profile,
      trust_level: profile.trust_level ?? 'observe',
      execution_count: profile.execution_count ?? profile.task_count ?? 0,
      review_count: profile.review_count ?? 0,
      supervisor_review_count: profile.supervisor_review_count ?? 0,
      human_review_count: profile.human_review_count ?? 0,
      critical_failure_count: profile.critical_failure_count ?? 0,
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
    assertNonEmptyId(execution.execution_id, 'execution_id');
    assertNonEmptyId(execution.agent_id, 'agent_id');

    const existing = this.executions.get(execution.execution_id);
    if (existing) {
      if (
        existing.task_id !== execution.task_id ||
        existing.agent_id !== execution.agent_id
      ) {
        throw new Error('execution_id already belongs to a different canonical task or agent');
      }
      return existing;
    }

    this.executions.set(execution.execution_id, execution);

    const agent = this.profiles.get(execution.agent_id);
    if (agent) {
      const previousExecutionCount = agent.execution_count ?? agent.task_count ?? 0;
      const nextExecutionCount = previousExecutionCount + 1;
      agent.execution_count = nextExecutionCount;
      agent.task_count = nextExecutionCount;
      agent.avg_latency_ms =
        (agent.avg_latency_ms * previousExecutionCount + execution.latency_ms) /
        nextExecutionCount;
      if (execution.status === 'failure' || execution.status === 'timeout') {
        agent.failure_count += 1;
        agent.last_failure_at = execution.completed_at || new Date().toISOString();
      }
    }

    return execution;
  }

  attachReview(review: ReviewEvidence): ReviewEvidence {
    assertCanonicalTaskId(review.task_id);
    assertNonEmptyId(review.review_id, 'review_id');
    if (!Number.isFinite(review.score) || review.score < 0 || review.score > 100) {
      throw new Error('Review score must be between 0 and 100');
    }

    const existingReview = this.reviews.get(review.review_id);
    if (existingReview) {
      if (
        existingReview.task_id !== review.task_id ||
        existingReview.execution_id !== review.execution_id
      ) {
        throw new Error('review_id already belongs to different evidence');
      }
      return existingReview;
    }

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
      const previousReviews = agent.review_count ?? 0;
      const nextReviews = previousReviews + 1;
      const approved = review.decision === 'approved' ? 1 : 0;
      agent.success_rate =
        (agent.success_rate * previousReviews + approved) / nextReviews;
      agent.review_count = nextReviews;

      if (review.reviewer_agent) {
        const previous = agent.supervisor_review_count ?? 0;
        const next = previous + 1;
        agent.supervisor_agreement =
          (agent.supervisor_agreement * previous + review.score / 100) / next;
        agent.supervisor_review_count = next;
      }

      if (review.reviewer_human) {
        const previous = agent.human_review_count ?? 0;
        const next = previous + 1;
        agent.human_agreement =
          (agent.human_agreement * previous + review.score / 100) / next;
        agent.human_review_count = next;
      }

      if (review.critical_failure === true) {
        agent.critical_failure_count = (agent.critical_failure_count ?? 0) + 1;
      }
    }

    return review;
  }

  recordLearning(record: LearningRecord): LearningRecord {
    assertCanonicalTaskId(record.task_id);
    assertNonEmptyId(record.evidence_id, 'evidence_id');

    const attachedExecution = this.executions.get(record.execution.execution_id);
    if (!attachedExecution) {
      throw new Error('Learning record execution must be attached first');
    }
    if (
      attachedExecution.task_id !== record.task_id ||
      record.execution.task_id !== record.task_id
    ) {
      throw new Error('Learning record task_id must match execution task_id');
    }

    if (record.review) {
      const attachedReview = this.reviews.get(record.review.review_id);
      if (!attachedReview) {
        throw new Error('Learning record review must be attached first');
      }
      if (
        attachedReview.task_id !== record.task_id ||
        attachedReview.execution_id !== record.execution.execution_id
      ) {
        throw new Error('Learning record review must match canonical task/execution');
      }
    }

    const existing = this.records.get(record.evidence_id);
    if (existing) {
      if (existing.task_id !== record.task_id) {
        throw new Error('evidence_id already belongs to a different canonical task');
      }
      return existing;
    }

    this.records.set(record.evidence_id, record);
    return record;
  }

  getLearningByTask(taskId: CanonicalTaskId): LearningRecord | undefined {
    return this.getLearningHistoryByTask(taskId)[0];
  }

  getLearningHistoryByTask(taskId: CanonicalTaskId): LearningRecord[] {
    assertCanonicalTaskId(taskId);
    return Array.from(this.records.values()).filter((record) => record.task_id === taskId);
  }

  getExecutionsByTask(taskId: CanonicalTaskId): ExecutionEvidence[] {
    assertCanonicalTaskId(taskId);
    return Array.from(this.executions.values()).filter(
      (execution) => execution.task_id === taskId
    );
  }

  getReviewsByTask(taskId: CanonicalTaskId): ReviewEvidence[] {
    assertCanonicalTaskId(taskId);
    return Array.from(this.reviews.values()).filter((review) => review.task_id === taskId);
  }

  exportSnapshot(): AgentLearningSnapshot {
    return {
      schema_version: 'AgentLearningSnapshotV1',
      generated_at: new Date().toISOString(),
      profiles: Array.from(this.profiles.values()).map((value) => ({ ...value })),
      executions: Array.from(this.executions.values()).map((value) => ({ ...value })),
      reviews: Array.from(this.reviews.values()).map((value) => ({
        ...value,
        findings: [...value.findings],
      })),
      records: Array.from(this.records.values()).map((value) => ({ ...value })),
      promotion_policies: this.promotionPolicies.map((value) => ({ ...value })),
    };
  }

  restoreSnapshot(snapshot: AgentLearningSnapshot): void {
    if (snapshot.schema_version !== 'AgentLearningSnapshotV1') {
      throw new Error('Unsupported agent-learning snapshot schema');
    }

    const executionById = new Map<string, ExecutionEvidence>();
    for (const execution of snapshot.executions) {
      assertCanonicalTaskId(execution.task_id);
      assertNonEmptyId(execution.execution_id, 'execution_id');
      executionById.set(execution.execution_id, { ...execution });
    }

    const reviewById = new Map<string, ReviewEvidence>();
    for (const review of snapshot.reviews) {
      assertCanonicalTaskId(review.task_id);
      const execution = executionById.get(review.execution_id);
      if (!execution || execution.task_id !== review.task_id) {
        throw new Error('Snapshot review references invalid canonical execution');
      }
      reviewById.set(review.review_id, { ...review, findings: [...review.findings] });
    }

    const recordById = new Map<string, LearningRecord>();
    for (const record of snapshot.records) {
      assertCanonicalTaskId(record.task_id);
      const execution = executionById.get(record.execution.execution_id);
      if (!execution || execution.task_id !== record.task_id) {
        throw new Error('Snapshot learning record references invalid canonical execution');
      }
      if (record.review) {
        const review = reviewById.get(record.review.review_id);
        if (!review || review.task_id !== record.task_id) {
          throw new Error('Snapshot learning record references invalid review');
        }
      }
      recordById.set(record.evidence_id, { ...record });
    }

    this.profiles.clear();
    for (const profile of snapshot.profiles) {
      this.profiles.set(profile.agent_id, { ...profile });
    }
    this.executions.clear();
    for (const [id, execution] of executionById) this.executions.set(id, execution);
    this.reviews.clear();
    for (const [id, review] of reviewById) this.reviews.set(id, review);
    this.records.clear();
    for (const [id, record] of recordById) this.records.set(id, record);
    this.promotionPolicies = snapshot.promotion_policies.map((value) => ({ ...value }));
  }

  setPromotionPolicies(policies: PromotionPolicy[]): void {
    this.promotionPolicies = policies;
  }

  promoteIfEligible(agentId: string): boolean {
    const agent = this.profiles.get(agentId);
    if (!agent) throw new Error('Agent profile not found');

    const policy = this.promotionPolicies.find((p) => p.from_level === agent.trust_level);
    if (!policy) return false;

    const ok =
      agent.task_count >= policy.minimum_tasks &&
      agent.supervisor_agreement >= policy.min_supervisor_agreement &&
      (agent.critical_failure_count ?? 0) <= policy.max_critical_failures &&
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
      .slice(-3)
      .filter((e) => e.status === 'failure').length;

    const shouldDemote = recentFailures === 3 || agent.success_rate < 0.8;
    if (!shouldDemote || agent.trust_level === 'observe') return false;

    const idx = TRUST_LEVELS.indexOf(agent.trust_level);
    if (idx <= 0) return false;
    agent.trust_level = TRUST_LEVELS[idx - 1] as TrustLevel;
    return true;
  }

  getScorecard(agentId: string) {
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
      execution_count: agent.execution_count ?? agent.task_count,
      review_count: agent.review_count ?? 0,
      supervisor_review_count: agent.supervisor_review_count ?? 0,
      human_review_count: agent.human_review_count ?? 0,
      critical_failure_count: agent.critical_failure_count ?? 0,
      last_failure_at: agent.last_failure_at,
      capabilities: agent.capabilities,
    };
  }
}

function assertNonEmptyId(value: string, field: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} must be a non-empty string`);
  }
}

export function assertCanonicalTaskId(taskId: string): asserts taskId is CanonicalTaskId {
  if (typeof taskId !== 'string' || taskId.trim().length === 0) {
    throw new Error(
      'Agent Lab requires canonical task_id (= AgentTaskEnvelopeV1.request_id). Refusing empty/independent identity.'
    );
  }
}

/** Hard guard: learning layer must never mint a task identity of its own. */
export function refuseIndependentTaskCreation(): never {
  throw new Error(
    'Agent Lab cannot create canonical tasks. Use agent-task-core assignAgentTask / AgentTaskEnvelopeV1.'
  );
}
