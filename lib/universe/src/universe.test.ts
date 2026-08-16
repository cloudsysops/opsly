import { describe, expect, it } from 'vitest';
import {
  UniverseUnknownCharacterError,
  assertCanonIntegrity,
  buildImagePrompt,
  buildVideoPrompt,
  composeStory,
  getCharacter,
  getCharactersForTopic,
  getContext,
  getRelationship,
  getWorld,
  listCharacters,
  listRelationships,
  listWorlds,
  serializeCanon,
  universe,
} from './index.js';
import { getTenantAdaptation } from './tenant.js';

describe('Opsly Universe registry', () => {
  it('returns canonical characters with unique ids and slugs', () => {
    const characters = listCharacters();
    expect(characters.length).toBeGreaterThanOrEqual(8);
    const ids = characters.map((character) => character.id);
    const slugs = characters.map((character) => character.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(universe.getCharacter('nova').name).toBe('NØVA');
    expect(getCharacter('traveler').name).toBe('THE TRAVELER');
  });

  it('validates schemas, Visual DNA, and immutableTraits', () => {
    expect(() => assertCanonIntegrity()).not.toThrow();
    for (const character of listCharacters()) {
      expect(character.visualIdentity.dna.invariants.length).toBeGreaterThanOrEqual(3);
      expect(character.visualIdentity.dna.negatives.length).toBeGreaterThanOrEqual(3);
      expect(character.canon.immutableTraits.length).toBeGreaterThan(0);
    }
  });

  it('maps topics to the intended cast', () => {
    expect(getCharactersForTopic('swimming').map((character) => character.id)).toEqual([
      'orion',
      'kai',
    ]);
    expect(getCharactersForTopic('technology').map((character) => character.id)).toEqual([
      'nova',
      'echo',
      'traveler',
    ]);
    expect(getCharactersForTopic('animals').map((character) => character.id)).toEqual([
      'maya',
      'kai',
    ]);
    expect(getCharactersForTopic('science').map((character) => character.id)).toEqual([
      'lyra',
      'nova',
      'echo',
    ]);
  });

  it('fails on unknown characters', () => {
    expect(() => getCharacter('not-a-canon-person')).toThrow(UniverseUnknownCharacterError);
  });
});

describe('relationships and worlds', () => {
  it('keeps relationship references valid', () => {
    const ids = new Set(listCharacters().map((character) => character.id));
    for (const edge of listRelationships()) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to) || edge.to === 'group' || edge.to === 'everyone').toBe(true);
    }
    const novaKai = getRelationship('nova', 'kai');
    expect(novaKai?.kind).toBe('older-brother-energy');
  });

  it('keeps world character references valid', () => {
    const ids = new Set(listCharacters().map((character) => character.id));
    for (const world of listWorlds()) {
      for (const characterId of world.allowedCharacters) {
        expect(ids.has(characterId)).toBe(true);
      }
    }
    expect(getWorld('nexus').name).toBe('NEXUS');
    expect(getWorld('move').allowedCharacters).toContain('orion');
  });

  it('lists Bitsitos as a channel for Nova, Kai, and Echo', () => {
    const { getCharactersForChannel } = universe;
    expect(getCharactersForChannel('bitsitos').map((character) => character.id).sort()).toEqual([
      'echo',
      'kai',
      'nova',
    ]);
  });
});

describe('prompts and composer', () => {
  it('keeps Visual DNA inside image and video prompts', () => {
    const image = buildImagePrompt({
      character: 'nova',
      scene: 'discovering an underwater city',
      mood: 'wonder',
      aspectRatio: '9:16',
    });
    expect(image.prompt).toContain('VISUAL DNA');
    expect(image.prompt).toContain('young human silhouette');
    expect(image.prompt).toContain('underwater city');
    expect(image.negativePrompt).toContain('no chrome robot body');
    const video = buildVideoPrompt({ character: 'traveler', scene: 'opening a portal' });
    expect(video.prompt).toContain('face concealed');
    expect(video.negativePrompt).toContain('no Marvel-like superhero suit');
  });

  it('composes agent context without dumping unused lore novels', () => {
    const context = universe.getContext({
      characters: ['nova', 'kai'],
      topic: 'swimming',
      audience: 'kids',
      tenant: 'peskids',
      format: 'youtube-short',
    });
    expect(context.characters.map((character) => character.id)).toEqual(['nova', 'kai']);
    expect(context.tenant?.tenant).toBe('peskids');
    expect(context.canonVersion).toBe('1.0');
    expect(JSON.stringify(context).length).toBeLessThan(200_000);
    expect(context.safetyRules.some((rule) => rule.includes('not mutate'))).toBe(true);
  });

  it('does not mutate global canon during tenant adaptation', () => {
    const before = JSON.stringify(getCharacter('orion').canon.immutableTraits);
    const peskids = getTenantAdaptation('peskids');
    expect(peskids?.mutatesCanon).toBe(false);
    getContext({
      topic: 'swimming',
      audience: 'kids',
      tenant: 'peskids',
    });
    const after = JSON.stringify(getCharacter('orion').canon.immutableTraits);
    expect(after).toBe(before);
    expect(getCharacter('orion').name).toBe('Orion');
  });

  it('composes story beats in order', () => {
    const story = composeStory({
      protagonist: 'kai',
      companions: ['nova'],
      world: 'wild',
      topic: 'why bees are important',
      conflict: 'the pollination network is disappearing',
      educationalObjective: 'explain pollination',
      emotionalObjective: 'develop empathy for small creatures',
      duration: 45,
      audience: 'kids',
      language: 'es',
    });
    expect(story.beats.map((beat) => beat.beat)).toEqual([
      'HOOK',
      'DISCOVERY',
      'CONFLICT',
      'EXPLANATION',
      'RESOLUTION',
      'LESSON',
      'CTA',
    ]);
    expect(story.context.educationalObjective).toContain('pollination');
  });

  it('serializes a machine-readable canon snapshot', () => {
    const snapshot = serializeCanon('2026-08-16T00:00:00.000Z');
    expect(snapshot.canonVersion).toBe('1.0');
    expect(snapshot.characters.length).toBeGreaterThanOrEqual(8);
    expect(snapshot.worlds.some((world) => world.id === 'nexus')).toBe(true);
  });
});
