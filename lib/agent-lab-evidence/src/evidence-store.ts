import type {
  AgentTrustProfile,
  ExecutionRecord,
  ReviewRecord,
  EvidenceRecord,
  TrustLevel,
  PromotionPolicy,
} from './types.js';

/**
 * In-memory reference implementation. Swap for a persisted store (Supabase table,
 * append-only log) behind the same interface once retention requirements exceed
 * process lifetime — do not fork this into a second job registry when you do.
 */
export class EvidenceStore {
  private trustProfiles: Map<string, AgentTrustProfile> = new Map();
  private executions: Map<string, ExecutionRecord> = new Map();
  private reviews: Map<string, ReviewRecord> = new Map();
  private evidence: Map<string, EvidenceRecord> = new Map();
  private promotionPolicies: PromotionPolicy[] = [];

  /** Register an agent for trust tracking. agent_id must match a canonical registry entry. */
  registerAgent(agent_id: string, initial_trust_level: TrustLevel = 'observe'): AgentTrustProfile {
    const profile: AgentTrustProfile = {
      agent_id,
      trust_level: initial_trust_level,
      task_count: 0,
      success_rate: 0,
      supervisor_agreement: 0,
      human_agreement: 0,
      avg_latency_ms: 0,
      failure_count: 0,
    };
    this.trustProfiles.set(agent_id, profile);
    return profile;
  }

  getAgent(agent_id: string): AgentTrustProfile | undefined {
    return this.trustProfiles.get(agent_id);
  }

  /**
   * Record an execution. Call this AFTER the canonical job (enqueued via
   * OrchestratorAgentTaskClient or compute-worker-router assignJob()) completes.
   * This does not execute anything itself.
   */
  recordExecution(execution: ExecutionRecord): ExecutionRecord {
    this.executions.set(execution.execution_id, execution);
    const agent = this.trustProfiles.get(execution.agent_id);
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

  recordReview(review: ReviewRecord): ReviewRecord {
    this.reviews.set(review.review_id, review);
    const execution = this.executions.get(review.execution_id);
    if (!execution) throw new Error('Execution not found');

    const agent = this.trustProfiles.get(execution.agent_id);
    if (!agent) throw new Error('Agent not found');

    const isApproved = review.decision === 'approved';
    agent.success_rate =
      (agent.success_rate * (agent.task_count - 1) + (isApproved ? 1 : 0)) / agent.task_count;

    if (review.reviewer_agent_id) {
      agent.supervisor_agreement =
        (agent.supervisor_agreement * (agent.task_count - 1) + review.score) / agent.task_count;
    }

    return review;
  }

  recordEvidence(evidence: EvidenceRecord): EvidenceRecord {
    this.evidence.set(evidence.evidence_id, evidence);
    return evidence;
  }

  setPromotionPolicies(policies: PromotionPolicy[]): void {
    this.promotionPolicies = policies;
  }

  promoteIfEligible(agent_id: string): boolean {
    const agent = this.trustProfiles.get(agent_id);
    if (!agent) throw new Error('Agent not found');

    const applicable = this.promotionPolicies.find((p) => p.from_level === agent.trust_level);
    if (!applicable) return false;

    const meets =
      agent.task_count >= applicable.minimum_tasks &&
      agent.supervisor_agreement >= applicable.min_supervisor_agreement &&
      agent.failure_count <= applicable.max_critical_failures &&
      agent.success_rate >= applicable.min_success_rate;

    if (meets) {
      agent.trust_level = applicable.to_level;
      return true;
    }

    return false;
  }

  demoteIfDegraded(agent_id: string): boolean {
    const agent = this.trustProfiles.get(agent_id);
    if (!agent) throw new Error('Agent not found');

    const recentFailures = Array.from(this.executions.values())
      .filter((e) => e.agent_id === agent_id)
      .slice(-3)
      .filter((e) => e.status === 'failure').length;

    const shouldDemote = recentFailures === 3 || agent.success_rate < 0.8;

    if (shouldDemote && agent.trust_level !== 'observe') {
      const levels: TrustLevel[] = ['observe', 'shadow', 'supervised', 'trusted', 'autonomous_low_risk'];
      const currentIndex = levels.indexOf(agent.trust_level);
      if (currentIndex > 0) {
        agent.trust_level = levels[currentIndex - 1];
        return true;
      }
    }

    return false;
  }

  getAgentScorecard(agent_id: string) {
    const agent = this.trustProfiles.get(agent_id);
    if (!agent) return null;

    return {
      agent_id,
      task_count: agent.task_count,
      success_rate: (agent.success_rate * 100).toFixed(1) + '%',
      supervisor_agreement: (agent.supervisor_agreement * 100).toFixed(1) + '%',
      human_agreement: (agent.human_agreement * 100).toFixed(1) + '%',
      avg_latency_ms: agent.avg_latency_ms.toFixed(0),
      failure_count: agent.failure_count,
      current_level: agent.trust_level,
      last_failure: agent.last_failure_at,
    };
  }

  getAllAgentScorecards() {
    return Array.from(this.trustProfiles.keys()).map((id) => this.getAgentScorecard(id));
  }

  getExecutionsByAgent(agent_id: string): ExecutionRecord[] {
    return Array.from(this.executions.values()).filter((e) => e.agent_id === agent_id);
  }

  getEvidenceByRequestId(request_id: string): EvidenceRecord | undefined {
    return Array.from(this.evidence.values()).find((e) => e.request_id === request_id);
  }
}
