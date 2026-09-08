/**
 * Duplicate suppression for public lead intake.
 *
 * The public form has no session, so there is nothing to correlate a retry
 * against: a double-click, a flaky mobile connection or a client-side retry all
 * created a second lead (and a second CRM person, and a second hot-lead alert).
 *
 * Two mechanisms are supported:
 *
 *  1. An explicit `Idempotency-Key` header, when the caller can supply one.
 *  2. A derived natural key — lead type + email + phone — for the browser form,
 *     which cannot.
 *
 * LIMITATION, stated plainly: this cache is per process, like the existing
 * lib/rate-limit.ts. With more than one app instance a duplicate can still slip
 * through. The durable fix is a unique partial index on
 * `platform.peskids_leads` (tenant_slug, lower(email), lead_type) over a recent
 * window, which lives in apps/api and is recommended in the audit report — this
 * module closes the common single-instance case without pretending to be that.
 */

import { createHash } from 'node:crypto';

export const INTAKE_IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

type CacheEntry = { leadId: string; body: Record<string, unknown>; expiresAt: number };

const cache = new Map<string, CacheEntry>();

function prune(now: number): void {
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) cache.delete(key);
  }
}

/** Stable key for one logical submission. Returns null when there is nothing to key on. */
export function intakeIdempotencyKey(input: {
  explicitKey?: string | null;
  leadType?: string | null;
  email?: string | null;
  phone?: string | null;
}): string | null {
  const explicit = input.explicitKey?.trim();
  if (explicit && explicit.length >= 8 && explicit.length <= 200) {
    return `explicit:${explicit}`;
  }

  const email = input.email?.trim().toLowerCase() ?? '';
  if (!email) return null;

  const material = [
    input.leadType?.trim().toLowerCase() ?? 'family',
    email,
    (input.phone ?? '').replace(/\D+/g, ''),
  ].join('|');

  // Hashed so the cache key never holds a raw email address in memory.
  return `derived:${createHash('sha256').update(material).digest('hex')}`;
}

/** Previously stored response for this key, or null. */
export function lookupIntake(
  key: string,
  now: number = Date.now()
): { leadId: string; body: Record<string, unknown> } | null {
  prune(now);
  const entry = cache.get(key);
  if (!entry || entry.expiresAt <= now) return null;
  return { leadId: entry.leadId, body: entry.body };
}

export function rememberIntake(
  key: string,
  value: { leadId: string; body: Record<string, unknown> },
  now: number = Date.now(),
  ttlMs: number = INTAKE_IDEMPOTENCY_TTL_MS
): void {
  prune(now);
  cache.set(key, { leadId: value.leadId, body: value.body, expiresAt: now + ttlMs });
}

/** Test helper. */
export function resetIntakeIdempotencyCache(): void {
  cache.clear();
}
