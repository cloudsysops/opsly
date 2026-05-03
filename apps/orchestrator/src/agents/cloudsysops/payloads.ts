import type { OpsAgentInput, SalesAgentInput } from './types.js';

function isChatTurn(v: unknown): v is { role: 'user' | 'assistant'; content: string } {
  if (typeof v !== 'object' || v === null) {
    return false;
  }
  const o = v as Record<string, unknown>;
  return (
    (o.role === 'user' || o.role === 'assistant') &&
    typeof o.content === 'string' &&
    o.content.length > 0
  );
}

export function parseSalesAgentPayload(payload: Record<string, unknown>): SalesAgentInput | null {
  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const customerId = typeof payload.customer_id === 'string' ? payload.customer_id.trim() : '';
  const tenantId = typeof payload.tenant_id === 'string' ? payload.tenant_id.trim() : '';
  if (!message || !customerId || !tenantId) {
    return null;
  }
  const rawHistory = payload.conversation_history;
  const conversationHistory = Array.isArray(rawHistory)
    ? rawHistory.filter(isChatTurn)
    : [];
  const contextBlock =
    typeof payload.context_block === 'string' ? payload.context_block : undefined;
  return {
    message,
    customerId,
    tenantId,
    conversationHistory,
    contextBlock,
  };
}

function isMetricsRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function parseOpsAgentPayload(payload: Record<string, unknown>): OpsAgentInput | null {
  const bookingId = typeof payload.booking_id === 'string' ? payload.booking_id.trim() : '';
  const tenantId = typeof payload.tenant_id === 'string' ? payload.tenant_id.trim() : '';
  const serviceType = typeof payload.service_type === 'string' ? payload.service_type.trim() : '';
  const findings = typeof payload.findings === 'string' ? payload.findings.trim() : '';
  const actionsPerformed =
    typeof payload.actions_performed === 'string' ? payload.actions_performed.trim() : '';
  const sat = payload.customer_satisfaction;
  const customerSatisfaction =
    typeof sat === 'number' && Number.isFinite(sat) ? Math.min(5, Math.max(1, Math.floor(sat))) : 0;
  const m = payload.metrics_before_after;
  if (
    !bookingId ||
    !tenantId ||
    !serviceType ||
    !findings ||
    !actionsPerformed ||
    customerSatisfaction < 1
  ) {
    return null;
  }
  if (!isMetricsRecord(m) || !('before' in m) || !('after' in m)) {
    return null;
  }
  const inner = m as { before: unknown; after: unknown };
  if (!isMetricsRecord(inner.before) || !isMetricsRecord(inner.after)) {
    return null;
  }
  return {
    bookingId,
    tenantId,
    serviceType,
    findings,
    actionsPerformed,
    metricsBeforeAfter: { before: inner.before, after: inner.after },
    customerSatisfaction,
  };
}
