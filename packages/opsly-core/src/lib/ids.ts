import { randomUUID } from 'node:crypto';

import type { Uuid } from '../types/index.js';

export function newRequestId(existing?: Uuid): Uuid {
  return existing ?? randomUUID();
}

export function newEventId(): Uuid {
  return randomUUID();
}

export function isoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}
