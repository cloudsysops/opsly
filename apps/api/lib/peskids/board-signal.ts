import { buildLeadCreatedEvent } from '@intcloudsysops/ai-board';
import type { PeskidsLeadRow } from './repository';

function eventBusUrl(): string | null {
  const raw =
    process.env.OPSLY_EVENT_BUS_URL?.trim() || process.env.OPSLY_ORCHESTRATOR_URL?.trim() || '';
  if (!raw) {
    return null;
  }
  if (raw.includes('localhost') || raw.includes('127.0.0.1')) {
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
  }
  return raw.endsWith('/events') ? raw : `${raw.replace(/\/$/, '')}/events`;
}

/**
 * Fire-and-forget board signal. Never throws. Intake must not await this.
 */
export async function emitPeskidsLeadBoardEvent(row: PeskidsLeadRow): Promise<void> {
  const busUrl = eventBusUrl();
  if (!busUrl) {
    return;
  }

  const event = buildLeadCreatedEvent({
    tenantSlug: row.tenant_slug,
    leadId: row.id,
    hasPhone: Boolean(row.phone?.trim()),
    occurredAt: row.created_at,
  });
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Peskids-Event': 'true',
  };
  const token = process.env.OPSLY_EVENT_BUS_TOKEN?.trim();
  if (token) {
    headers['X-Opsly-Event-Token'] = token;
  }

  try {
    const response = await fetch(busUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
      signal: AbortSignal.timeout(2_000),
    });
    if (!response.ok) {
      console.warn('[peskids] board event emit failed', {
        lead_id: row.id,
        status: response.status,
      });
    }
  } catch (error: unknown) {
    console.warn('[peskids] board event emit skipped', {
      lead_id: row.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
