import { describe, expect, it } from 'vitest';
import {
  buildAgentTicket,
  canApproveChangeRequest,
  canTransitionChangeRequestStatus,
  isChangeRequestStatus,
} from '@/lib/change-request-ticket';

describe('change-request status transitions', () => {
  it('recognizes legacy and new statuses', () => {
    expect(isChangeRequestStatus('task_created')).toBe(true);
    expect(isChangeRequestStatus('dismissed')).toBe(true);
    expect(isChangeRequestStatus('approved')).toBe(true);
    expect(isChangeRequestStatus('triaged')).toBe(true);
    expect(isChangeRequestStatus('bogus')).toBe(false);
  });

  it('allows analyzed → triaged / approved / rejected', () => {
    expect(canTransitionChangeRequestStatus('analyzed', 'triaged')).toBe(true);
    expect(canTransitionChangeRequestStatus('analyzed', 'approved')).toBe(true);
    expect(canTransitionChangeRequestStatus('analyzed', 'rejected')).toBe(true);
    expect(canTransitionChangeRequestStatus('analyzed', 'shipped')).toBe(false);
  });

  it('blocks transitions out of shipped', () => {
    expect(canTransitionChangeRequestStatus('shipped', 'approved')).toBe(false);
    expect(canTransitionChangeRequestStatus('shipped', 'shipped')).toBe(true);
  });

  it('marks only pre-approval statuses as approvable', () => {
    expect(canApproveChangeRequest('analyzed')).toBe(true);
    expect(canApproveChangeRequest('task_created')).toBe(true);
    expect(canApproveChangeRequest('triaged')).toBe(true);
    expect(canApproveChangeRequest('approved')).toBe(false);
    expect(canApproveChangeRequest('in_progress')).toBe(false);
    expect(canApproveChangeRequest('shipped')).toBe(false);
  });
});

describe('buildAgentTicket', () => {
  it('builds an agent-ready payload without execution side effects', () => {
    const ticket = buildAgentTicket({
      messageId: 'msg-1',
      tenantId: 'peskids',
      requestedBy: 'owner@peskids.com',
      category: 'feature',
      priority: 'alta',
      summary: null,
      body: 'Quiero recordatorios de clase por WhatsApp',
      aiSummary: 'Recordatorios de clase por WhatsApp',
      twentyTaskId: 'twenty-abc',
      operatorNotes: 'Validar con dueña antes de prod',
      now: new Date('2026-07-26T15:00:00.000Z'),
    });

    expect(ticket.version).toBe(1);
    expect(ticket.execution_policy).toBe('human_approval_required');
    expect(ticket.summary).toContain('Recordatorios');
    expect(ticket.context).toContain('WhatsApp');
    expect(ticket.context).toContain('Validar con dueña');
    expect(ticket.probable_files.length).toBeGreaterThan(0);
    expect(ticket.acceptance_criteria.some((c) => c.includes('WhatsApp'))).toBe(true);
    expect(ticket.validation_commands.some((c) => c.includes('type-check'))).toBe(true);
    expect(ticket.risk.toLowerCase()).toContain('auto-deploy');
    expect(ticket.requested_by).toBe('owner@peskids.com');
    expect(ticket.twenty_task_id).toBe('twenty-abc');
    expect(ticket.generated_at).toBe('2026-07-26T15:00:00.000Z');
  });

  it('falls back to body slice when summaries are missing', () => {
    const ticket = buildAgentTicket({
      messageId: 'msg-2',
      tenantId: 'peskids',
      requestedBy: null,
      category: null,
      priority: null,
      summary: null,
      body: 'Texto de solicitud sin resumen AI todavía',
      aiSummary: null,
      twentyTaskId: null,
    });

    expect(ticket.category).toBeNull();
    expect(ticket.summary).toContain('Texto de solicitud');
    expect(ticket.probable_files.some((p) => p.includes('apps/peskids'))).toBe(true);
  });
});
