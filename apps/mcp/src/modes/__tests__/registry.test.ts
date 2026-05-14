import { describe, expect, it } from 'vitest';

import { collectRegisteredToolNames } from '../../server.js';
import {
  BUILT_IN_MODES,
  getAvailableModes,
  getModeConfig,
  validateModeAccess,
  validateModeToolReferences,
} from '../registry.js';

describe('BUILT_IN_MODES registry', () => {
  it('defines exactly 10 modes', () => {
    expect(Object.keys(BUILT_IN_MODES)).toHaveLength(10);
  });

  it('has no duplicate tool names within allowed lists (non-wildcard)', () => {
    for (const [id, mode] of Object.entries(BUILT_IN_MODES)) {
      const nonWild = mode.tools.allowed.filter((t) => t !== '*');
      const uniq = new Set(nonWild);
      expect(uniq.size, `duplicates in mode ${id}`).toBe(nonWild.length);
    }
  });

  it('getModeConfig returns definition for known ids', () => {
    expect(getModeConfig('developer')?.id).toBe('developer');
    expect(getModeConfig('unknown')).toBeUndefined();
  });

  it('validateModeAccess enforces minPlan', () => {
    expect(validateModeAccess('quantum', 'startup')).toBe(false);
    expect(validateModeAccess('quantum', 'enterprise')).toBe(true);
    expect(validateModeAccess('gamer', 'startup')).toBe(false);
    expect(validateModeAccess('gamer', 'business')).toBe(true);
    expect(validateModeAccess('developer', 'startup')).toBe(true);
  });

  it('getAvailableModes filters by plan', () => {
    const startup = getAvailableModes('startup');
    expect(startup).toContain('developer');
    expect(startup).not.toContain('quantum');
    expect(startup).not.toContain('gamer');
    expect(getAvailableModes('enterprise')).toContain('quantum');
  });

  it('allowed/blocked tools reference only registered MCP tool names', () => {
    const names = new Set(collectRegisteredToolNames());
    const errs = validateModeToolReferences(names);
    expect(errs, errs.join('; ')).toEqual([]);
  });
});
