import { logger } from '../logger';
import type { MeteringEventPayload } from './types';

/**
 * Log estructurado (stdout) para auditoría; no bloquea la petición HTTP.
 */
export function logMeteringAudit(
  event: MeteringEventPayload,
  extra?: Record<string, unknown>
): void {
  logger.info('Metering event', {
    type: 'billing_metering',
    tenant_id: event.tenantId,
    metric_type: event.metricType,
    quantity: event.quantity,
    operation: event.operation,
    kind: event.kind,
    request_id: event.requestId,
    ...extra,
  });
}
