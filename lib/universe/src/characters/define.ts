import { CANON_VERSION } from '../constants.js';
import { UniverseCharacterSchema } from '../schemas.js';
import type { UniverseCharacter } from '../types.js';

export function defineCharacter(
  character: Omit<UniverseCharacter, 'relationships'> & {
    relationships?: UniverseCharacter['relationships'];
  },
): UniverseCharacter {
  return UniverseCharacterSchema.parse({
    relationships: character.relationships ?? [],
    ...character,
    canon: {
      ...character.canon,
      version: CANON_VERSION,
    },
  });
}
