import { VIRTUAL_RELATIONSHIP_TARGETS } from './constants.js';
import { UniverseError } from './errors.js';
import {
  getCharacter,
  listCharacters,
  listRelationships,
  listWorlds,
} from './registry.js';

export function assertCanonIntegrity(): void {
  const characters = listCharacters();
  const ids = characters.map((character) => character.id);
  const slugs = characters.map((character) => character.slug);
  if (new Set(ids).size !== ids.length) {
    throw new UniverseError('DUPLICATE_ID', 'Character ids must be unique');
  }
  if (new Set(slugs).size !== slugs.length) {
    throw new UniverseError('DUPLICATE_SLUG', 'Character slugs must be unique');
  }
  for (const character of characters) {
    if (character.visualIdentity.dna.invariants.length < 3) {
      throw new UniverseError('MISSING_VISUAL_DNA', `${character.id} missing Visual DNA invariants`);
    }
    if (character.canon.immutableTraits.length < 1) {
      throw new UniverseError('EMPTY_IMMUTABLE', `${character.id} immutableTraits empty`);
    }
  }
  const known = new Set(ids);
  for (const target of VIRTUAL_RELATIONSHIP_TARGETS) known.add(target);
  for (const edge of listRelationships()) {
    if (!known.has(edge.from)) {
      throw new UniverseError('BAD_RELATIONSHIP', `Unknown from: ${edge.from}`);
    }
    if (!known.has(edge.to)) {
      throw new UniverseError('BAD_RELATIONSHIP', `Unknown to: ${edge.to}`);
    }
    getCharacter(edge.from);
  }
  for (const world of listWorlds()) {
    for (const characterId of world.allowedCharacters) {
      if (!ids.includes(characterId)) {
        throw new UniverseError('BAD_WORLD_REF', `${world.id} references unknown ${characterId}`);
      }
    }
  }
}
