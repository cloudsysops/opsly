import { describe, expect, it } from 'vitest';
import {
  evaluateUniverseChangeGuard,
  getFoundation,
  getHistory,
  getNonNegotiables,
  getPrinciples,
  getVision,
  isUniverseChangeAllowed,
  universe,
} from './index.js';

describe('Opsly Universe foundation', () => {
  it('loads the machine-readable foundation', () => {
    const foundation = getFoundation();
    expect(foundation.foundationVersion).toBe('1.0.0');
    expect(foundation.futureVision.status).toBe('open');
    expect(foundation.futureVision.statement).toBe('THE MAP IS STILL BEING DRAWN.');
  });

  it('exposes foundation slices through the public API', () => {
    expect(getVision()).toContain('THE MAP IS STILL BEING DRAWN');
    expect(getPrinciples()).toContain("We do not choose the child's path; we help them discover it.");
    expect(getHistory().some((era) => era.name === 'Nebula Nexus')).toBe(true);
    expect(getNonNegotiables()).toContain('No open child DMs.');
    expect(universe.getChildSafetyPrinciples().some((rule) => rule.includes('guardian'))).toBe(true);
  });

  it('keeps the foundation immutable across reads', () => {
    const first = getFoundation();
    const second = getFoundation();
    expect(second).toBe(first);
  });
});

describe('Opsly Universe change guard', () => {
  it('allows safe universe changes', () => {
    const result = evaluateUniverseChangeGuard({});
    expect(result.allowed).toBe(true);
    expect(result.blocked).toEqual([]);
    expect(isUniverseChangeAllowed({})).toBe(true);
  });

  it('blocks explicitly unsafe child-safety proposals', () => {
    const result = evaluateUniverseChangeGuard({
      openChildDms: true,
      unrestrictedChildChat: true,
      behavioralAdvertising: true,
      publicChildIdentity: true,
      publishWithoutConsent: true,
      hardcodeCanonIntoConsumer: true,
      duplicateCanon: true,
    });
    expect(result.allowed).toBe(false);
    expect(result.blocked).toEqual([
      'open_child_dms',
      'unrestricted_child_chat',
      'behavioral_advertising',
      'public_child_identity',
      'publish_without_consent',
      'hardcode_canon_into_consumer',
      'duplicate_canon',
    ]);
    expect(result.reasons).toContain('No open child DMs.');
    expect(result.reasons).toContain('No parallel canon; reuse the canonical universe package.');
  });
});
