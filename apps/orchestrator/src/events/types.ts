export type OpslyEvent =
  | 'tenant.onboarded'
  | 'tenant.suspended'
  | 'job.completed'
  | 'job.failed'
  | 'llm.called'
  | 'invite.sent';
