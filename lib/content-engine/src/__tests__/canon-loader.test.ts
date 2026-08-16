import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CanonCharacterNotFoundError, listCanonCharacterIds, loadCanonCharacter } from '../characters/canon-loader.js';

describe('loadCanonCharacter (real repo canon)', () => {
  it('loads the-traveler from data/content/characters/the-traveler.json', () => {
    const character = loadCanonCharacter('the-traveler');
    expect(character.canonical_name).toBe('The Traveler');
    expect(character.visual.generation_prompt).toBeTruthy();
    expect(character.visual.negative_prompt).toContain('face');
    expect(character.prohibited_variations.length).toBeGreaterThan(0);
  });

  it('loads nova with its curious-inner-child archetype', () => {
    const character = loadCanonCharacter('nova');
    expect(character.canonical_name).toBe('NØVA');
    expect(character.personality.archetype).toMatch(/Curious/i);
  });

  it('loads wavo', () => {
    const character = loadCanonCharacter('wavo');
    expect(character.canonical_name).toBe('Wavo');
  });

  it('lists all canon character ids from the real bible', () => {
    const ids = listCanonCharacterIds();
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
