import { atlas } from './atlas.js';
import { echo } from './echo.js';
import { kai } from './kai.js';
import { lyra } from './lyra.js';
import { maya } from './maya.js';
import { nova } from './nova.js';
import { orion } from './orion.js';
import { traveler } from './traveler.js';
import { wavo } from './wavo.js';
import type { UniverseCharacter } from '../types.js';

export const CANONICAL_CHARACTERS: UniverseCharacter[] = [
  traveler,
  nova,
  kai,
  lyra,
  orion,
  atlas,
  maya,
  echo,
  wavo,
];

export {
  atlas,
  echo,
  kai,
  lyra,
  maya,
  nova,
  orion,
  traveler,
  wavo,
};
