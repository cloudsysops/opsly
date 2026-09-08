import type { AutomationLevel, BoardJobSpec, BoardSignal, BoardJobType, JobPriority } from './types.js';
import { CONTACT_HOT_LEAD_ACCEPTANCE } from './jobs-constants.js';

export { CONTACT_HOT_LEAD_ACCEPTANCE, boardJobIdempotencyKey } from './jobs-constants.js';

export function isSameBoardCondition(existing: string, next: string): boolean {
  return existing === next;
}

export function dedupeBoardJobs(jobs: BoardJobSpec[]): BoardJobSpec[] {
  const seen = new Set<string>();
  const unique: BoardJobSpec[] = [];
  for (const job of jobs) {
    if (seen.has(job.idempotency_key)) {
      continue;
    }
    seen.add(job.idempotency_key);
    unique.push(job);
  }
  return unique;
}

function buildJob(input: {
  signal: BoardSignal;
  jobType: BoardJobType;
  priority: JobPriority;
  level: AutomationLevel;
  acceptance: readonly string[];
}): BoardJobSpec {
  const { signal, jobType, priority, level, acceptance } = input;
  return {
    job_type: jobType,
    signal_type: signal.type,
    tenant_slug: signal.tenant_slug,
    priority,
    owner_capability: 'peskids-support',
    automation_level: level,
    idempotency_key: `${signal.tenant_slug}:${jobType}:${signal.type}:${signal.entity_id}`,
    entity_kind: signal.entity_kind,
    entity_id: signal.entity_id,
    acceptance,
    execute_external: false,
  };
}

export function mapSignalToBoardJob(signal: BoardSignal): BoardJobSpec | null {
  switch (signal.type) {
    case 'HOT_LEAD_CREATED':
    case 'HOT_LEAD_UNATTENDED':
    case 'ENROLLMENT_INCOMPLETE':
      return buildJob({
        signal,
        jobType: 'SEND_ENROLLMENT_LINK',
        priority: 'P1',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'ENROLLMENT_SUBMITTED':
      return buildJob({
        signal,
        jobType: 'PREPARE_WHATSAPP_DRAFT',
        priority: 'P2',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'FIRST_CLASS_SCHEDULED':
    case 'CLASS_REMINDER_DUE':
      return buildJob({
        signal,
        jobType: 'PREPARE_CLASS_REMINDER',
        priority: 'P2',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'CLASS_ABSENT':
      return buildJob({
        signal,
        jobType: 'PREPARE_ABSENCE_FOLLOWUP',
        priority: 'P2',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'CLASS_ATTENDED':
    case 'TEACHER_FEEDBACK_PENDING':
      return buildJob({
        signal,
        jobType: 'REQUEST_TEACHER_FEEDBACK',
        priority: 'P2',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'STUDENT_PROGRESS_UPDATED':
      return buildJob({
        signal,
        jobType: 'REQUEST_FAMILY_FEEDBACK',
        priority: 'P3',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'FAMILY_FEEDBACK_RECEIVED':
      return buildJob({
        signal,
        jobType: 'REQUEST_FAMILY_FEEDBACK',
        priority: 'P3',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'FAMILY_CONTACT_REQUESTED':
      return buildJob({
        signal,
        jobType: 'FOLLOWUP_CONTACT',
        priority: 'P1',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'FOLLOWUP_OVERDUE':
    case 'LEAD_NO_RESPONSE':
      return buildJob({
        signal,
        jobType: 'PREPARE_CONTINUITY_FOLLOWUP',
        priority: 'P2',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'WHATSAPP_DRAFT_READY':
      return buildJob({
        signal,
        jobType: 'PREPARE_WHATSAPP_DRAFT',
        priority: 'P2',
        level: 2,
        acceptance: CONTACT_HOT_LEAD_ACCEPTANCE,
      });
    case 'AUTOMATION_FAILED':
      return buildJob({
        signal,
        jobType: 'RECORD_AUTOMATION_FAILURE',
        priority: 'P1',
        level: 0,
        acceptance: ['failure_recorded'],
      });
    default:
      return null;
  }
}
