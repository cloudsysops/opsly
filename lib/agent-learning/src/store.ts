import type {
  AgentLearningProfile,
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
        (agent.avg_latency_ms * (agent.task_count - 1) + execution.latency_ms) / agent.task_count;
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
          (agent.supervisor_agreement * Math.max(agent.task_count - 1, 0) + review.score / 100) /
          Math.max(agent.task_count, 1);
      }
    }

    return review;
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
      last_failure_at: agent.last_failure_at,
      capabilities: agent.capabilities,
    };
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
