import { newEventId, isoTimestamp } from '../lib/ids.js';
import type {
  EventStatus,
  IntentName,
  OpslyEvent,
  TenantSlug,
  Uuid,
} from '../types/index.js';

export interface BuildEventInput {
  tenantSlug: TenantSlug;
  intent: IntentName;
  payload: Readonly<Record<string, unknown>>;
  requestId: Uuid;
  status: EventStatus;
  metadata?: Readonly<Record<string, unknown>>;
}

export class EventBuilder {
  build(input: BuildEventInput): OpslyEvent {
    return {
      id: newEventId(),
      requestId: input.requestId,
      tenantSlug: input.tenantSlug,
      intent: input.intent,
      payload: input.payload,
      status: input.status,
      createdAt: isoTimestamp(),
      metadata: input.metadata,
    };
  }
}
