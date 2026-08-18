import { describe, expect, it } from 'vitest';
import { bitCardFromBit, getBit, getBitsForWorld, getCharacter, getWorld, listBits } from './index.js';

describe('Universe bits', () => {
  it('registers Dewthread as original WILD canon', () => {
    const bit = getBit('dewthread');
    expect(bit.name).toBe('Dewthread');
    expect(bit.world).toBe('wild');
    expect(bit.bondRules).toContain('connection_not_capture');
    expect(bit.visualDNA.negatives.some((rule) => /pokémon|pokemon/i.test(rule))).toBe(true);
    expect(getBitsForWorld('wild').map((item) => item.id)).toEqual(['dewthread']);
    expect(listBits()).toHaveLength(1);
    expect(bitCardFromBit(bit).ability).toBe('Dew Path');
  });

  it('resolves Maya and WILD from Universe, not a parallel canon', () => {
    expect(getCharacter('maya').id).toBe('maya');
    expect(getWorld('wild').id).toBe('wild');
    expect(getWorld('wild').allowedCharacters).toContain('maya');
  });
});
