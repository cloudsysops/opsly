import { createClient } from 'redis';
import type { OpslyEvent } from './types.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function buildClient() {
  return createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });
}

export interface EventSubscriptionHandle {
  close(): Promise<void>;
}

export async function publishEvent(
  event: OpslyEvent,
  data: Record<string, unknown>
): Promise<void> {
  const publisher = buildClient();
  await publisher.connect();
  await publisher.publish(
    'opsly:events',
    JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    })
  );
  await publisher.disconnect();
}

/** Tenant domain events from apps (Peskids message.received, lead.created, …). */
export type TenantDomainEventPayload = {
  event_type: string;
  tenant_id: string;
  created_at: string;
  data: Record<string, unknown>;
  trace_id?: string;
};

export async function publishTenantDomainEvent(
  payload: TenantDomainEventPayload
): Promise<void> {
  const publisher = buildClient();
  await publisher.connect();
  await publisher.publish(
    'opsly:events',
    JSON.stringify({
      event: payload.event_type,
      tenant_id: payload.tenant_id,
      data: payload.data,
      created_at: payload.created_at,
      trace_id: payload.trace_id,
      timestamp: new Date().toISOString(),
      source: 'http_events',
    })
  );
  await publisher.disconnect();
}

export async function subscribeEvents(
  handler: (event: OpslyEvent, data: Record<string, unknown>) => Promise<void>
): Promise<EventSubscriptionHandle> {
  const subscriber = buildClient();
  await subscriber.connect();
  await subscriber.subscribe('opsly:events', async (message) => {
    const parsed = JSON.parse(message) as {
      event: OpslyEvent;
      data: Record<string, unknown>;
    };
    await handler(parsed.event, parsed.data);
  });

  return {
    async close(): Promise<void> {
      await subscriber.unsubscribe('opsly:events');
      if (subscriber.isOpen) {
        await subscriber.disconnect();
      }
    },
  };
}
