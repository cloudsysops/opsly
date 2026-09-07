import type { DomainEvent, IngestResult } from './types.js';
import { stripForbiddenPii } from './pii.js';
import { mapDomainEventToSignals } from './signals.js';
import { dedupeBoardJobs, mapSignalToBoardJob } from './jobs.js';
import { denyExternalCustomerSend, isLevelWithinCap, PESKIDS_SUPPORT_AUTOMATION_CAP } from './levels.js';

function isValidTenantSlug(value: string): boolean {
  return /^[a-z0-9-]{3,64}$/.test(value);
}

export function ingestDomainEvent(event: DomainEvent): IngestResult {
  if (!event.event_type?.trim() || !isValidTenantSlug(event.tenant_slug)) {
    return { ok: false, signals: [], jobs: [], rejected_reason: 'invalid' };
  }
  const data = stripForbiddenPii(event.data);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, signals: [], jobs: [], rejected_reason: 'invalid' };
  }
  const sanitized: DomainEvent = { ...event, data: data as Record<string, unknown> };
  const signals = mapDomainEventToSignals(sanitized);
  const mapped = signals
    .map((signal) => mapSignalToBoardJob(signal))
    .filter((job): job is NonNullable<typeof job> => job !== null);
  const jobs = dedupeBoardJobs(mapped);

  for (const job of jobs) {
    if (denyExternalCustomerSend(job.automation_level)) {
      return { ok: false, signals, jobs: [], rejected_reason: 'level_denied' };
    }
    if (!isLevelWithinCap(job.automation_level, PESKIDS_SUPPORT_AUTOMATION_CAP) && job.automation_level > 0) {
      return { ok: false, signals, jobs: [], rejected_reason: 'level_denied' };
    }
  }

  return { ok: true, signals, jobs };
}

export function buildLeadCreatedEvent(input: {
  tenantSlug: string;
  leadId: string;
  hasPhone: boolean;
  requestId?: string;
  occurredAt?: string;
}): DomainEvent {
  return {
    event_type: 'lead.created',
    tenant_slug: input.tenantSlug,
    occurred_at: input.occurredAt,
    request_id: input.requestId,
    data: {
      lead_id: input.leadId,
      hot: input.hasPhone,
      has_phone: input.hasPhone,
    },
  };
}
