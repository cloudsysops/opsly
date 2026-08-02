import type { AgentTaskType } from '@intcloudsysops/types/agent-task';
import { agentTaskTypeSchema } from '@intcloudsysops/types/agent-task';

const CLASS_PATTERNS: ReadonlyArray<readonly [AgentTaskType, RegExp]> = [
  ['research', /investigar|research|document|contexto|explica|how does|planning|planificar/i],
  ['code', /implement|código|codigo|bug|fix|api|backend|frontend|refactor|test/i],
  ['review', /review|revis|audit|auditor|security|seguridad|quality/i],
  ['browser', /browser|navegador|e2e|playwright|ui|interfaz/i],
  ['infra', /docker|deploy|desplieg|infra|vps|health|operaci/i],
  ['qa', /\bqa\b|quality assurance|smoke|regression/i],
  ['planning', /roadmap|sprint|prioriz|backlog|plan\b/i],
  ['documentation', /docs?|readme|adr|runbook|documentaci/i],
];

export const AGENT_TASK_TYPES: readonly AgentTaskType[] = [
  'research',
  'code',
  'review',
  'browser',
  'infra',
  'qa',
  'planning',
  'documentation',
] as const;

export function inferTaskType(task: string, requested?: string): AgentTaskType {
  if (requested) {
    const parsed = agentTaskTypeSchema.safeParse(requested);
    if (parsed.success) return parsed.data;
  }
  const text = String(task ?? '').trim();
  for (const [taskType, pattern] of CLASS_PATTERNS) {
    if (pattern.test(text)) return taskType;
  }
  return 'research';
}
