import { describe, it, expect, beforeAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CharacterRegistry, loadCharacter } from '../CharacterRegistry.js';
import type { CharacterProfile } from '../../types.js';

const validCharacter: CharacterProfile = {
  id: 'opsly-founder',
  canonical_name: 'The Visionary',
  role: 'Protagonist',
  personality: {
    archetype: 'Visionary Builder',
    traits: ['optimistic', 'technical'],
    narrative_role: 'protagonist',
  },
  visual: {
    silhouette_prompt: 'human with mechanical arm',
    proportions: { head: 1, torso: 2, legs: 3 },
    face: { eye_style: 'warm amber', mouth_style: 'thoughtful', expressions: ['neutral', 'inspired'] },
    hair_style: 'dark wavy',
    clothing: { primary: 'black jacket', accessories: ['utility belt'], symbols: ['sacred geometry'] },
    color_palette: ['#000000', '#FFD700'],
    mechanical_elements: ['left arm prosthetic'],
    generation_prompt: 'A visionary human-machine hybrid...',
    negative_prompt: 'no cartoonish style',
  },
  voice: { language: 'both', tone: 'warm', speed: 'normal' },
  prohibited_variations: ['no second robot arm'],
};

describe('CharacterRegistry', () => {
  let dir: string;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'opsly-characters-'));
    writeFileSync(join(dir, 'opsly-founder.json'), JSON.stringify(validCharacter));
    writeFileSync(
      join(dir, 'invalid.json'),
      JSON.stringify({ id: 'not-a-real-id', canonical_name: 'X' })
    );
  });

  it('loads a valid character file', () => {
    const character = loadCharacter(join(dir, 'opsly-founder.json'));
    expect(character.id).toBe('opsly-founder');
    expect(character.personality.narrative_role).toBe('protagonist');
  });

  it('throws with a descriptive message for an invalid character file', () => {
    expect(() => loadCharacter(join(dir, 'invalid.json'))).toThrow(/Character validation failed/);
  });

  it('registry getAll/getById/requireById work against a directory', () => {
    const validOnlyDir = mkdtempSync(join(tmpdir(), 'opsly-characters-valid-'));
    writeFileSync(join(validOnlyDir, 'opsly-founder.json'), JSON.stringify(validCharacter));

    const registry = new CharacterRegistry({ charactersDir: validOnlyDir });
    expect(registry.getAll()).toHaveLength(1);
    expect(registry.getById('opsly-founder')?.canonical_name).toBe('The Visionary');
    expect(registry.getById('missing')).toBeUndefined();
    expect(() => registry.requireById('missing')).toThrow(/Character not found/);

    rmSync(validOnlyDir, { recursive: true, force: true });
  });
});
