import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CanonCharacterNotFoundError, listCanonCharacterIds, loadCanonCharacter } from '../characters/canon-loader.js';

describe('loadCanonCharacter (Universe SoT)', () => {
  it('projects THE TRAVELER from @intcloudsysops/universe, including the-traveler alias', () => {
    const character = loadCanonCharacter('the-traveler');
    expect(character.source).toBe('universe');
    expect(character.id).toBe('traveler');
    expect(character.canonical_name).toBe('THE TRAVELER');
    expect(character.visual.generation_prompt).toBeTruthy();
    expect(character.visual.negative_prompt.length).toBeGreaterThan(0);
    expect(character.prohibited_variations.length).toBeGreaterThan(0);
  });

  it('projects NØVA from Universe, not the legacy JSON bible', () => {
    const character = loadCanonCharacter('nova');
    expect(character.source).toBe('universe');
    expect(character.canonical_name).toBe('NØVA');
    expect(character.personality.archetype).toMatch(/explorer/i);
  });

  it('loads wavo as aquatic companion (not swim coach)', () => {
    const character = loadCanonCharacter('wavo');
    expect(character.source).toBe('universe');
    expect(character.canonical_name).toBe('Wavo');
    expect(character.role).toMatch(/companion/i);
  });

  it('lists Universe ids plus legacy aliases', () => {
    const ids = listCanonCharacterIds();
    expect(ids).toContain('traveler');
    expect(ids).toContain('the-traveler');
    expect(ids).toContain('nova');
    expect(ids).toContain('wavo');
  });

  it('caches repeated loads', () => {
    const first = loadCanonCharacter('nova');
    const second = loadCanonCharacter('nova');
    expect(second).toEqual(first);
  });
});

describe('loadCanonCharacter (isolated fixture dir)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'content-engine-canon-test-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('throws CanonCharacterNotFoundError for a missing character', () => {
    expect(() => loadCanonCharacter('does-not-exist', dir)).toThrow(CanonCharacterNotFoundError);
  });

  it('throws for malformed JSON rather than returning a partial object', () => {
    writeFileSync(join(dir, 'broken.json'), '{ not valid json', 'utf8');
    expect(() => loadCanonCharacter('broken', dir)).toThrow(CanonCharacterNotFoundError);
  });

  it('returns an empty list for a directory with no character files', () => {
    expect(listCanonCharacterIds(dir)).toEqual([]);
  });

  it('returns an empty list for a nonexistent directory rather than throwing', () => {
    expect(listCanonCharacterIds(join(dir, 'nope'))).toEqual([]);
  });
});
