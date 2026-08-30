import { describe, expect, it } from 'vitest';
import { FORBIDDEN_EVENT_PREFIXES } from './constants.js';
import { assertObservationEvent, assertSafeDisplayName } from './safety.js';

describe('game-core child-safety observations', () => {
  it('blocks diagnosis-style event types', () => {
    for (const prefix of FORBIDDEN_EVENT_PREFIXES) {
      expect(() => assertObservationEvent(`${prefix}child`)).toThrow(/observations/);
    }
  });

  it('rejects emails in explorer display names', () => {
    expect(() => assertSafeDisplayName('ada@school.test')).toThrow(/contact identity/);
  });

  it('rejects phone-like explorer display names', () => {
    expect(() => assertSafeDisplayName('+573001112233')).toThrow(/contact identity/);
  });
});
