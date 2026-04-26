import { describe, expect, it } from 'vitest';
import { hashPrompt } from '../src/hash.js';

describe('cache/hash', () => {
  it('genera hash estable del prompt', () => {
    const first = hashPrompt([{ role: 'user', content: 'hola' }], 'sys');
    const second = hashPrompt([{ role: 'user', content: 'hola' }], 'sys');
    expect(first).toBe(second);
    expect(first).toHaveLength(32);
  });
});
