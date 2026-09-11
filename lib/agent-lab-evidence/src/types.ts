/**
 * Agent Lab Evidence Layer — types.
 *
 * This module does NOT own task identity, routing, policy, or queueing.
 * Those are canonical elsewhere:
 *   - Task envelope/identity: AgentTaskEnvelopeV1 (@intcloudsysops/types, lib/agent-task-core)
 *   - Agent identity/capabilities: config/external-agent-registry.json (CLI agents),
 *     config/compute-workers.json (PC-gamer GPU/Ollama workers)
 *   - Routing: lib/external-agent-registry (routeAgentTask), scripts/ops/compute-worker-router.mjs (assignJob)
 *   - Policy: lib/agent-task-core/policy.ts (evaluateAgentTaskPolicy)
 *   - Queueing/runtime state: apps/orchestrator (local-agents / openclaw / content-video queues,
 *     Redis JobState — see ADR-048)
 *
 * This module only answers: "what happened when an agent executed a task, who reviewed it,
 * and has that agent earned more trust?" Every record below is keyed by the canonical
 * `request_id` (AgentTaskEnvelopeV1.request_id) and `agent_id` (a registry worker id —
 * opsly_job_type from external-agent-registry.json, or workerId from compute-workers.json).
 */

export type TrustLevel = 'observe' | 'shadow' | 'supervised' | 'trusted' | 'autonomous_low_risk';
export type ReviewDecision = 'approved' | 'request_changes' | 'needs_human';

/**
 * Scoring-only profile for an agent already registered in a canonical registry
 * (external-agent-registry.json or compute-workers.json). Does NOT duplicate
 * identity fields (model, capabilities, command, ...) — look those up from the
 * owning registry by agent_id instead.
 */
export interface AgentTrustProfile {
  agent_id: string;
  trust_level: TrustLevel;
  task_count: number;
  success_rate: number;
  supervisor_agreement: number;
  human_agreement: number;
  avg_latency_ms: number;
  failure_count: number;
  last_failure_at?: string;
}

/**
 * What happened when an agent executed a task. `request_id` MUST be the
 * request_id of the AgentTaskEnvelopeV1 that was enqueued via
 * OrchestratorAgentTaskClient or routed via compute-worker-router's assignJob().
 * This record does not replace Orchestrator JobState; it is written after the
 * canonical job finishes, referencing the same id.
 */
export interface ExecutionRecord {
  execution_id: string;
  request_id: string;
  agent_id: string;
  prompt_version: string;
  input_hash: string;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  output: unknown;
  tools_used: string[];
  resource_usage: {
    tokens_in: number;
    tokens_out: number;
    vram_mb: number;
  };
  status: 'success' | 'failure' | 'timeout';
}

/** Independent reviewer decision. Builder != reviewer whenever practical. */
export interface ReviewRecord {
  review_id: string;
  execution_id: string;
  reviewer_agent_id?: string;
  reviewer_human?: string;
  reviewed_at: string;
  decision: ReviewDecision;
  findings: string[];
  repair_suggestion?: string;
  score: number;
}

/** Full trace kept for future evaluation sets / fine-tuning signal. No ML performed here. */
export interface EvidenceRecord {
  evidence_id: string;
  request_id: string;
  execution: ExecutionRecord;
  review: ReviewRecord;
  final_result: unknown;
  human_decision?: ReviewDecision;
  learning_lesson?: string;
  metrics: {
    worker_agreed_with_supervisor: boolean;
    worker_agreed_with_human: boolean;
    supervisor_agreed_with_human: boolean;
  };
}

export interface PromptVersion {
  prompt_id: string;
  version: number;
  agent_id: string;
  created_at: string;
  content: string;
  performance_metrics?: {
    avg_score: number;
    execution_count: number;
    avg_latency_ms: number;
  };
}

export interface PromotionPolicy {
  from_level: TrustLevel;
  to_level: TrustLevel;
  minimum_tasks: number;
  min_supervisor_agreement: number;
  max_critical_failures: number;
  min_success_rate: number;
}
