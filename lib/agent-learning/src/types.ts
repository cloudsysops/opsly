export type TrustLevel =
  | 'observe'
  | 'shadow'
  | 'supervised'
  | 'trusted'
  | 'autonomous_low_risk';

export type ReviewDecision = 'approved' | 'request_changes' | 'needs_human';

/** Canonical task identity = AgentTaskEnvelopeV1.request_id */
export type CanonicalTaskId = string;

export type AgentLearningProfile = {
  agent_id: string;
  model: string;
  role: string;
  capabilities: string[];
  trust_level: TrustLevel;
  task_count: number;
  success_rate: number;
  supervisor_agreement: number;
  human_agreement: number;
  avg_latency_ms: number;
  failure_count: number;
  execution_count?: number;
  review_count?: number;
  supervisor_review_count?: number;
  human_review_count?: number;
  critical_failure_count?: number;
  last_failure_at?: string;
};

export type ExecutionEvidence = {
  execution_id: string;
  task_id: CanonicalTaskId;
  agent_id: string;
  model: string;
  prompt_version: string;
  started_at: string;
  completed_at: string;
  latency_ms: number;
  output: unknown;
  status: 'success' | 'failure' | 'timeout';
};

export type ReviewEvidence = {
  review_id: string;
  task_id: CanonicalTaskId;
  execution_id: string;
  reviewer_agent?: string;
  reviewer_human?: string;
  reviewed_at: string;
  decision: ReviewDecision;
  findings: string[];
  score: number;
  critical_failure?: boolean;
  repair_suggestion?: string;
};

export type LearningRecord = {
  evidence_id: string;
  task_id: CanonicalTaskId;
  execution: ExecutionEvidence;
  review?: ReviewEvidence;
  human_decision?: ReviewDecision;
  learning_lesson?: string;
  trust_delta?: number;
};

export type PromotionPolicy = {
  from_level: TrustLevel;
  to_level: TrustLevel;
  minimum_tasks: number;
  min_supervisor_agreement: number;
  max_critical_failures: number;
  min_success_rate: number;
};

export const TRUST_LEVELS: TrustLevel[] = [
  'observe',
  'shadow',
  'supervised',
  'trusted',
  'autonomous_low_risk',
];


export type AgentLearningSnapshot = {
  schema_version: 'AgentLearningSnapshotV1';
  generated_at: string;
  profiles: AgentLearningProfile[];
  executions: ExecutionEvidence[];
  reviews: ReviewEvidence[];
  records: LearningRecord[];
  promotion_policies: PromotionPolicy[];
};
