/**
 * Agreement lifecycle engine.
 *
 * The stored `state` is the last known contractual state. `deriveAgreementStatus`
 * computes the *derived* operational status for states that advance with the
 * calendar (active → expiring → expired). Draft/pending/terminated/suspended
 * are controlled by human or system transitions, never by time.
 *
 * Expiry alerts are configurable thresholds (defaults: 180/90/60/30 days) and
 * pure — no scheduling, messaging or persistence happens here.
 */

import type { AgreementStatus, FranchiseAgreement } from './types.js';
import { AGREEMENT_STATUSES } from './constants.js';

const DAY_MS = 86_400_000;

export const AGREEMENT_STATUS_FLOW: Record<AgreementStatus, readonly AgreementStatus[]> = {
  draft: ['pending_signature', 'terminated'],
  pending_signature: ['active', 'terminated', 'suspended'],
  active: ['suspended', 'terminated', 'expiring'],
  expiring: ['suspended', 'terminated', 'expired'],
  expired: [],
  terminated: [],
  suspended: ['active', 'terminated'],
};

export function isAgreementStatus(value: unknown): value is AgreementStatus {
  return typeof value === 'string' && (AGREEMENT_STATUSES as readonly string[]).includes(value);
}

export function canTransitionAgreement(from: AgreementStatus, to: AgreementStatus): boolean {
  if (from === to) return true;
  return AGREEMENT_STATUS_FLOW[from]?.includes(to) ?? false;
}

export type DerivedAgreementStatusInput = {
  state: AgreementStatus;
  effectiveDate: string;
  expirationDate: string;
  noticeDays: number;
  now: string;
};

/**
 * Derives the operational status for an agreement. Returns the stored state for
 * statuses that are controlled by explicit transitions, and time-advances only
 * `active`/`expiring`/`expired`.
 */
export function deriveAgreementStatus(input: DerivedAgreementStatusInput): AgreementStatus {
  const { state, expirationDate, noticeDays, now } = input;
  if (
    state === 'draft' ||
    state === 'pending_signature' ||
    state === 'terminated' ||
    state === 'suspended'
  ) {
    return state;
  }
  const nowMs = new Date(now).getTime();
  const expMs = new Date(expirationDate).getTime();
  if (nowMs > expMs || state === 'expired') {
    return 'expired';
  }
  const daysUntilExpiry = Math.ceil((expMs - nowMs) / DAY_MS);
  if (daysUntilExpiry <= Math.max(0, Math.floor(noticeDays))) {
    return 'expiring';
  }
  return 'active';
}

export type ExpiryAlertLevel = 'info' | 'warning' | 'critical';
export type ExpiryAlert = {
  thresholdDays: number;
  daysUntilExpiry: number;
  level: ExpiryAlertLevel;
};

const DEFAULT_EXPIRY_THRESHOLDS: readonly number[] = [180, 90, 60, 30];

export function expiryAlertLevel(thresholdDays: number): ExpiryAlertLevel {
  if (thresholdDays <= 30) return 'critical';
  if (thresholdDays <= 90) return 'warning';
  return 'info';
}

/**
 * Alerts for an agreement that is active or expiring. Emits exactly one alert:
 * the threshold band the current date falls into (the smallest threshold already
 * crossed/pending from the expiry horizon). Already-expired agreements return an
 * empty list.
 */
export function agreementExpiryAlerts(input: {
  expirationDate: string;
  now: string;
  thresholds?: readonly number[];
}): ExpiryAlert[] {
  const thresholds = input.thresholds ?? DEFAULT_EXPIRY_THRESHOLDS;
  const nowMs = new Date(input.now).getTime();
  const expMs = new Date(input.expirationDate).getTime();
  if (nowMs >= expMs) return [];
  const daysUntilExpiry = (expMs - nowMs) / DAY_MS;
  const band = [...thresholds].sort((a, b) => a - b).find((t) => daysUntilExpiry <= t);
  if (band === undefined) return [];
  return [
    {
      thresholdDays: band,
      daysUntilExpiry: Math.max(0, Math.ceil(daysUntilExpiry)),
      level: expiryAlertLevel(band),
    },
  ];
}

/**
 * `true` when a non-renewal notice given at `noticeAt` still satisfies the
 * agreement's notice period (notice must be at least `noticeDays` before
 * `expirationDate`).
 */
export function noticeCompliant(input: {
  noticeAt: string;
  expirationDate: string;
  noticeDays: number;
}): { compliant: boolean; daysOfNotice: number; requiredDays: number } {
  const noticeMs = new Date(input.noticeAt).getTime();
  const expMs = new Date(input.expirationDate).getTime();
  const daysOfNotice = Math.floor((expMs - noticeMs) / DAY_MS);
  return {
    compliant: daysOfNotice >= input.noticeDays,
    daysOfNotice,
    requiredDays: input.noticeDays,
  };
}

/** Pure helper to compute a projected expiration date given term length. */
export function expirationDateFromTerm(input: {
  effectiveDate: string;
  termMonths: number;
}): string {
  const d = new Date(input.effectiveDate);
  d.setUTCMonth(d.getUTCMonth() + input.termMonths);
  return d.toISOString();
}

/** Convenience: full derived state for display, given a stored agreement. */
export function agreementOperationalStatus(
  agreement: FranchiseAgreement,
  now: string
): AgreementStatus {
  return deriveAgreementStatus({
    state: agreement.state,
    effectiveDate: agreement.effectiveDate,
    expirationDate: agreement.expirationDate,
    noticeDays: agreement.noticeDays,
    now,
  });
}
