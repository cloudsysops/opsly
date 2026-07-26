/**
 * Change-request agent ticket builder + status transitions.
 *
 * IMPORTANT — no auto-execution:
 * - AI may classify/summarize staff requests.
 * - Humans approve/triage/reject in admin.
 * - `buildAgentTicket` only produces a JSON payload for a later agent session.
 * - This module NEVER runs shell, deploys, sends WhatsApp, or mutates prod beyond DB status fields (callers update DB).
 */

import type { ImprovementCategory, ImprovementPriority } from '@/lib/improvement-chat-assistant';

/** Full intake lifecycle + legacy statuses kept for backward compatibility. */
export const CHANGE_REQUEST_STATUSES = [
  'new',
  'analyzed',
  'task_created',
  'triaged',
  'approved',
  'in_progress',
  'shipped',
  'rejected',
  'dismissed',
] as const;

export type ChangeRequestStatus = (typeof CHANGE_REQUEST_STATUSES)[number];

export type AgentTicket = {
  version: 1;
  message_id: string;
  tenant_id: string;
  requested_by: string | null;
  category: ImprovementCategory | null;
  priority: ImprovementPriority | null;
  summary: string;
  context: string;
  probable_files: string[];
  acceptance_criteria: string[];
  validation_commands: string[];
  risk: string;
  /** Explicit policy: humans/agents must act deliberately — never auto-run. */
  execution_policy: 'human_approval_required';
  twenty_task_id: string | null;
  generated_at: string;
};

const APPROVABLE_FROM: ReadonlySet<ChangeRequestStatus> = new Set([
  'new',
  'analyzed',
  'task_created',
  'triaged',
]);

/** Allowed manual transitions for PATCH (approve uses `canApproveChangeRequest`). */
const ALLOWED_TRANSITIONS: Record<ChangeRequestStatus, readonly ChangeRequestStatus[]> = {
  new: ['analyzed', 'task_created', 'triaged', 'approved', 'rejected', 'dismissed'],
  analyzed: ['triaged', 'approved', 'rejected', 'dismissed', 'in_progress'],
  task_created: ['triaged', 'approved', 'rejected', 'dismissed', 'in_progress'],
  triaged: ['approved', 'rejected', 'analyzed', 'dismissed'],
  approved: ['in_progress', 'rejected', 'triaged'],
  in_progress: ['shipped', 'rejected', 'approved'],
  shipped: [],
  rejected: ['triaged', 'analyzed'],
  dismissed: ['triaged', 'analyzed'],
};

export function isChangeRequestStatus(value: unknown): value is ChangeRequestStatus {
  return (
    typeof value === 'string' &&
    (CHANGE_REQUEST_STATUSES as readonly string[]).includes(value)
  );
}

export function canTransitionChangeRequestStatus(
  from: ChangeRequestStatus,
  to: ChangeRequestStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function canApproveChangeRequest(status: ChangeRequestStatus): boolean {
  return APPROVABLE_FROM.has(status);
}

const PROBABLE_FILES_BY_CATEGORY: Record<ImprovementCategory, string[]> = {
  bug: [
    'apps/peskids/app/api/',
    'apps/peskids/lib/services/',
    'apps/peskids/components/',
  ],
  feature: [
    'apps/peskids/app/',
    'apps/peskids/components/',
    'apps/peskids/lib/',
    'apps/peskids/migrations/',
  ],
  improvement: [
    'apps/peskids/components/',
    'apps/peskids/lib/',
    'apps/peskids/app/admin/',
  ],
  security: [
    'apps/peskids/lib/staff-auth.ts',
    'apps/peskids/lib/family-auth.ts',
    'apps/peskids/middleware.ts',
    'apps/peskids/migrations/',
  ],
  billing: [
    'apps/peskids/lib/services/',
    'apps/peskids/app/api/',
    'docs/tenants/peskids/',
  ],
  question: ['docs/tenants/peskids/', 'AGENTS.md'],
  other: ['apps/peskids/', 'docs/tenants/peskids/'],
};

const VALIDATION_COMMANDS = [
  'cd apps/peskids && npm run type-check',
  'cd apps/peskids && npm run test -- lib/__tests__/change-request-ticket.test.ts',
] as const;

export type BuildAgentTicketInput = {
  messageId: string;
  tenantId: string;
  requestedBy: string | null;
  category: ImprovementCategory | null;
  priority: ImprovementPriority | null;
  summary: string | null;
  body: string;
  aiSummary: string | null;
  twentyTaskId: string | null;
  operatorNotes?: string | null;
  now?: Date;
};

/**
 * Builds an agent-ready ticket JSON after human approval.
 * Does not execute anything — callers only persist this object.
 */
export function buildAgentTicket(input: BuildAgentTicketInput): AgentTicket {
  const category = input.category ?? 'other';
  const summary =
    (input.aiSummary?.trim() || input.summary?.trim() || input.body.trim().slice(0, 140)) ||
    'Solicitud de cambio Peskids';

  const contextParts = [
    `Solicitud original:\n${input.body.trim()}`,
    input.aiSummary?.trim() ? `Resumen AI (solo clasificación):\n${input.aiSummary.trim()}` : null,
    input.operatorNotes?.trim()
      ? `Notas del operador:\n${input.operatorNotes.trim()}`
      : null,
  ].filter((part): part is string => Boolean(part));

  const riskHints: string[] = [];
  if (category === 'security' || category === 'billing') {
    riskHints.push('Área sensible — revisión humana obligatoria antes de merge.');
  }
  if (input.priority === 'alta') {
    riskHints.push('Prioridad alta — validar smoke en staging antes de prod.');
  }
  riskHints.push(
    'No hay auto-deploy ni envío WhatsApp desde este ticket; ejecución solo tras handoff humano/agente.'
  );

  return {
    version: 1,
    message_id: input.messageId,
    tenant_id: input.tenantId,
    requested_by: input.requestedBy,
    category: input.category,
    priority: input.priority,
    summary,
    context: contextParts.join('\n\n'),
    probable_files: [...PROBABLE_FILES_BY_CATEGORY[category]],
    acceptance_criteria: [
      'El cambio cubre el resumen aprobado por Opsly.',
      'Type-check del workspace peskids en verde.',
      'Sin secretos en código ni commits.',
      'Sin envíos WhatsApp/deploy automáticos derivados de este ticket.',
    ],
    validation_commands: [...VALIDATION_COMMANDS],
    risk: riskHints.join(' '),
    execution_policy: 'human_approval_required',
    twenty_task_id: input.twentyTaskId,
    generated_at: (input.now ?? new Date()).toISOString(),
  };
}
