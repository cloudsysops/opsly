import type { BoardJobSpec } from './types.js';

export type SupportHumanButton = 'SEND' | 'SEND ENROLLMENT LINK';

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
  return {
    headline: enrollment
      ? 'Review context → send enrollment link'
      : 'One decision + one button',
    recommended_action: job.job_type,
    human_button: enrollment ? 'SEND ENROLLMENT LINK' : 'SEND',
    automation_level: 2,
    execute_external: false,
    acceptance: job.acceptance,
  };
}
