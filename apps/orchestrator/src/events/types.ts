export type OpslyEvent =
  | 'tenant.onboarded'
  | 'tenant.suspended'
  | 'job.completed'
  | 'job.failed'
  | 'llm.called'
  | 'invite.sent'
  | 'agent.status'
  | 'agent.task.started'
  | 'agent.task.completed'
  | 'agent.task.failed'
  | 'policy.violation';
