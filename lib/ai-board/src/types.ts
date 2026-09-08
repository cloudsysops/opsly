export const AUTOMATION_LEVELS = [0, 1, 2, 3, 4, 5] as const;
export type AutomationLevel = (typeof AUTOMATION_LEVELS)[number];

export const SIGNAL_TYPES = [
  'HOT_LEAD_CREATED',
  'HOT_LEAD_UNATTENDED',
  'ENROLLMENT_INCOMPLETE',
  'ENROLLMENT_SUBMITTED',
  'FIRST_CLASS_SCHEDULED',
  'CLASS_REMINDER_DUE',
  'CLASS_ATTENDED',
  'CLASS_ABSENT',
  'TEACHER_FEEDBACK_PENDING',
  'STUDENT_PROGRESS_UPDATED',
  'FAMILY_FEEDBACK_RECEIVED',
  'FAMILY_CONTACT_REQUESTED',
  'FOLLOWUP_OVERDUE',
  'LEAD_NO_RESPONSE',
  'AUTOMATION_FAILED',
  'WHATSAPP_DRAFT_READY',
] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const BOARD_JOB_TYPES = [
  'SEND_ENROLLMENT_LINK',
  'PREPARE_CLASS_REMINDER',
  'PREPARE_ABSENCE_FOLLOWUP',
  'REQUEST_TEACHER_FEEDBACK',
  'REQUEST_FAMILY_FEEDBACK',
  'PREPARE_CONTINUITY_FOLLOWUP',
  'FOLLOWUP_CONTACT',
  'RECORD_AUTOMATION_FAILURE',
  'PREPARE_WHATSAPP_DRAFT',
] as const;
export type BoardJobType = (typeof BOARD_JOB_TYPES)[number];

export const JOB_PRIORITIES = ['P1', 'P2', 'P3'] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export type EntityKind =
  | 'lead'
  | 'enrollment'
  | 'student'
  | 'class'
  | 'followup'
  | 'message'
  | 'automation'
  | 'feedback';

export type DomainEvent = {
  event_type: string;
  tenant_slug: string;
  occurred_at?: string;
  request_id?: string;
  data: Record<string, unknown>;
};

export type BoardSignal = {
  type: SignalType;
  tenant_slug: string;
  entity_kind: EntityKind;
  entity_id: string;
  occurred_at: string;
  request_id?: string;
  refs: Record<string, string>;
};

export type BoardJobSpec = {
  job_type: BoardJobType;
  signal_type: SignalType;
  tenant_slug: string;
  priority: JobPriority;
  owner_capability: string;
  automation_level: AutomationLevel;
  idempotency_key: string;
  entity_kind: EntityKind;
  entity_id: string;
  acceptance: readonly string[];
  execute_external: false;
};

export type IngestResult = {
  ok: boolean;
  signals: BoardSignal[];
  jobs: BoardJobSpec[];
  rejected_reason?: 'pii' | 'invalid' | 'level_denied';
};

export type FeatureFlagRisk = 'low' | 'medium' | 'high';
export type FeatureFlagState = 'off' | 'staging' | 'on';

export type FeatureFlagRecord = {
  flag: string;
  owner: string;
  environment: string;
  risk: FeatureFlagRisk;
  current_state: FeatureFlagState;
  staging_evidence: string | null;
  activation_timestamp: string | null;
  metrics: readonly string[];
  rollback_switch: string;
  customer_facing_send: boolean;
  automation_level: AutomationLevel;
};
