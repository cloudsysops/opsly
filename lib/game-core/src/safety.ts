import { FORBIDDEN_EVENT_PREFIXES } from './constants.js';
import { looksLikeEmail, looksLikePhone } from './ids.js';
import type { GameEvent } from './types.js';

export function assertPseudonymousId(id: string, label: string): void {
  if (looksLikeEmail(id) || looksLikePhone(id)) {
    throw new Error(`${label} must be pseudonymous (no email or phone)`);
  }
}

export function assertSafeDisplayName(name: string): void {
  if (looksLikeEmail(name) || looksLikePhone(name)) {
    throw new Error('Explorer displayName must not contain contact identity');
  }
}

export function assertObservationEvent(type: string): void {
  const forbidden = FORBIDDEN_EVENT_PREFIXES.some((prefix) => type.startsWith(prefix));
  if (forbidden) {
    throw new Error(`Game events must be observations, not diagnoses: ${type}`);
  }
}

export function assertEventHasEvidence(event: GameEvent): void {
  if (event.evidence.trim().length === 0) {
    throw new Error('Game events require evidence text');
  }
}
