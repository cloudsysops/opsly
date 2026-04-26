/**
 * Memoria OAR en proceso (MVP): contexto vacío + observaciones por sesión.
 *
 * @see docs/design/OAR.md — §4.1 MemoryInterface
 */

import type { MemoryFragment, MemoryInterface } from '../interfaces/memory.interface.js';

type SessionBucket = {
  readonly working: Record<string, unknown>;
  readonly observations: Array<{ step: number; content: string }>;
};

function sessionKey(tenantSlug: string, sessionId: string): string {
  return `${tenantSlug}::${sessionId}`;
}

export class InMemoryMemory implements MemoryInterface {
  private readonly sessions = new Map<string, SessionBucket>();

  async getWorkingContext(tenantSlug: string, sessionId: string): Promise<Record<string, unknown>> {
    const bucket = this.sessions.get(sessionKey(tenantSlug, sessionId));
    return bucket?.working ? { ...bucket.working } : {};
  }

  async appendObservation(
    tenantSlug: string,
    sessionId: string,
    step: number,
    content: string
  ): Promise<void> {
    const k = sessionKey(tenantSlug, sessionId);
    const prev = this.sessions.get(k);
    const observations = prev?.observations ?? [];
    observations.push({ step, content });
    this.sessions.set(k, {
      working: prev?.working ?? {},
      observations,
    });
  }

  async querySemantic(
    _tenantSlug: string,
    _query: string,
    _limit?: number
  ): Promise<MemoryFragment[]> {
    return [];
  }
}
