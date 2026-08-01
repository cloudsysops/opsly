import { describe, it, expect } from 'vitest';
import { activationStaleAfterMs, evaluateActivationPrecondition } from '../activation-guard';

const NOW = Date.parse('2026-08-01T12:00:00.000Z');
const SETUP_MINUTES = 30; // stale window = 30*2 + 5 = 65 min

function minutesAgo(minutes: number): string {
  return new Date(NOW - minutes * 60_000).toISOString();
}

describe('evaluateActivationPrecondition', () => {
  it('allows activation when there is no row (not_installed)', () => {
    expect(evaluateActivationPrecondition(null, SETUP_MINUTES, NOW)).toEqual({ allowed: true });
  });

  it('allows re-activation from failed and disabled', () => {
    for (const status of ['failed', 'disabled'] as const) {
      expect(
        evaluateActivationPrecondition({ status, updated_at: minutesAgo(1) }, SETUP_MINUTES, NOW)
      ).toEqual({ allowed: true });
    }
  });

  it('rejects when the module is already active', () => {
    for (const status of ['active', 'active_needs_manual_steps'] as const) {
      const result = evaluateActivationPrecondition(
        { status, updated_at: minutesAgo(1) },
        SETUP_MINUTES,
        NOW
      );
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe('already_active');
    }
  });

  it('rejects a fresh provisioning/queued row (concurrent activation guard)', () => {
    for (const status of ['queued', 'provisioning'] as const) {
      const result = evaluateActivationPrecondition(
        { status, updated_at: minutesAgo(10) },
        SETUP_MINUTES,
        NOW
      );
      expect(result.allowed).toBe(false);
      expect(result.allowed === false && result.reason).toBe('in_progress');
    }
  });

  it('rejects right up to the staleness threshold and allows just past it', () => {
    const windowMinutes = activationStaleAfterMs(SETUP_MINUTES) / 60_000;
    expect(windowMinutes).toBe(65);
    expect(
      evaluateActivationPrecondition(
        { status: 'provisioning', updated_at: minutesAgo(windowMinutes) },
        SETUP_MINUTES,
        NOW
      ).allowed
    ).toBe(false);
    expect(
      evaluateActivationPrecondition(
        { status: 'provisioning', updated_at: minutesAgo(windowMinutes + 1) },
        SETUP_MINUTES,
        NOW
      ).allowed
    ).toBe(true);
  });

  it('allows re-activation of a stale provisioning row (process died mid-run)', () => {
    expect(
      evaluateActivationPrecondition(
        { status: 'provisioning', updated_at: minutesAgo(24 * 60) },
        SETUP_MINUTES,
        NOW
      )
    ).toEqual({ allowed: true });
  });

  it('treats a missing/unparsable updated_at as stale so a row can never stick forever', () => {
    expect(
      evaluateActivationPrecondition(
        { status: 'provisioning', updated_at: null },
        SETUP_MINUTES,
        NOW
      )
    ).toEqual({ allowed: true });
    expect(
      evaluateActivationPrecondition(
        { status: 'provisioning', updated_at: 'not-a-date' },
        SETUP_MINUTES,
        NOW
      )
    ).toEqual({ allowed: true });
  });
});
