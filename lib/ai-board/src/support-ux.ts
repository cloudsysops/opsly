import type { BoardJobSpec } from './types.js';

export type SupportHumanButton = 'SEND' | 'SEND ENROLLMENT LINK' | 'PREPARE FIRST CLASS';

export type SupportWorkItem = {
  headline: string;
  recommended_action: string;
  human_button: SupportHumanButton;
  automation_level: 2;
  execute_external: false;
  acceptance: readonly string[];
};

export function buildSupportWorkItem(job: BoardJobSpec): SupportWorkItem {
  const enrollment = job.job_type === 'SEND_ENROLLMENT_LINK';
  const firstClass = job.job_type === 'PREPARE_FIRST_CLASS';
  return {
    headline: enrollment
      ? 'Review context → send enrollment link'
      : firstClass
        ? 'Enrollment complete → prepare first class'
        : 'One decision + one button',
    recommended_action: job.job_type,
    human_button: enrollment
      ? 'SEND ENROLLMENT LINK'
      : firstClass
        ? 'PREPARE FIRST CLASS'
        : 'SEND',
    automation_level: 2,
    execute_external: false,
    acceptance: job.acceptance,
  };
}
